//BRR
const geodataUrl = 'data/ken_counties.json';
const fourWDataUrl = 'https://raw.githubusercontent.com/collective-service/cs-kobo-scraper/main/data/data_kenya_4w.csv';
// const fourWDataUrl = 'data/data_kenya_4w_cleaned.csv';
const configFileURL = 'data/config.json';
const vaxURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSzl-1-YKB83rASc_f9s6xKYUY9PjMKQW1uQzbP50BcaPL2xvGovG9Y17xHt_GxSNBdJRJY-Qdhon9X/pub?gid=0&single=true&output=csv";
const descURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSzl-1-YKB83rASc_f9s6xKYUY9PjMKQW1uQzbP50BcaPL2xvGovG9Y17xHt_GxSNBdJRJY-Qdhon9X/pub?gid=1764626957&single=true&output=csv";

let geomData,
    mappingData,
    filteredMappingData,
    config,
    vaccinationData,
    descriptionData;

let parentsDefaultListArr = [],
    childrenDefaultListArr = [];

let parentsDetails = [],
    childrensDetails = [];

let displayBy = "activity";
let mapType = "orgs";

let activitiesAllArr, maxAct;

$(document).ready(function() {
    function getData() {
        Promise.all([
            d3.json(geodataUrl),
            d3.csv(fourWDataUrl),
            d3.json(configFileURL),
            d3.csv(vaxURL),
            d3.csv(descURL)
        ]).then(function(data) {
            geomData = topojson.feature(data[0], data[0].objects.kenya_counties);
            // console.log(geomData)
            config = data[2];
            data[1] = data[1].filter(d => { return d[config.ISO3] != ""; });
            data[1].forEach(element => {
                element[config.Partner_short] == "" ? element[config.Partner_short] = element[config.Partner] : null;
                // element[config.Activity] == "monitoring_eval" ? element[config.Activity] = "monitoring & evaluation" : null;
            });
            mappingData = data[1];
            filteredMappingData = mappingData;
            vaccinationData = data[3];
            descriptionData = data[4];

            generateDescription();

            parentsDefaultListArr = uniqueValues("Activity");
            activitiesAllArr = uniqueValues("Activity");
            maxAct = activitiesAllArr.length;
            childrenDefaultListArr = uniqueValues("Partner_short");

            parentsDetails = generatePanelDetailsArr();
            childrensDetails = generatePanelDetailsArr("Partner_short", "Partner");

            // createMainFiltersTag("parentFilters", []);
            // createMainFiltersTag("childrenFilters", []);
            createPanelListItems();
            createChildrenPanel();

            initiateMap();
            setMetricsPanels();
            //remove loader and show vis
            $('.loader').hide();
            $('.container-fluid').css('opacity', 1);
        }); // then
    } // getData

    getData();
});

function generateDescription() {

    const date = descriptionData[0][config.Desc.Date];
    const texte = descriptionData[0][config.Desc.Texte];
    d3.select("#date_updated").text(date);
    d3.select(".text-accroche").text(texte);
}

function generatePanelDetailsArr(parent, child) {
    const data = d3.nest()
        .key(d => { return d[config[parent]]; })
        .key(d => { return d[config[child]]; })
        .rollup(d => { return d.length; })
        .entries(mappingData);
    var arr = [];
    data.forEach(k => {
        const tab = k.values;
        arr.push({ key: k.key, value: tab[0].key });
    });
    // const act = un
    if (parent == undefined) {
        const vals = config.Activity_desc;
        activitiesAllArr.forEach(element => {
            arr.push({ key: element, value: vals[element] });
        });
    }
    return arr;
} //generatePanelDetailsArr

$('#displayBySelect').on("change", function(d) {
    displayBy = $('#displayBySelect').val();
    d3.select("#orgs").property("checked", true)
    mapType = "orgs";
    resetToDefault();

    //update map and metrics
})

function setLastUpdatedDate() {
    $('#date_updated').text(config.last_Date);
} //setLastUpdatedDate

function resetToDefault() {
    d3.select(".parentFilters").selectAll("span").classed("is-selected", false);
    d3.select(".collection-item").selectAll("li").classed("is-selected", false);
    d3.select(".children").selectAll("li").classed("is-selected", false);

    countrySelectedFromMap = "";

    // createMapFilterSpan();
    $(".map-filter").html("");
    // county report
    $("#countyReport").html('');

    const listParentTitle = displayBy == "activity" ? "Activities" : "Partners";
    const listChildTitle = displayBy == "activity" ? "Partners" : "Activities";
    $(".parent h6").text(listParentTitle);
    $(".child h6").text(listChildTitle);

    // updateDataFromFilters(); 
    filteredMappingData = mappingData;

    // updateViz();
    parentsDefaultListArr = getUpdatedParentArr();
    childrenDefaultListArr = getUpdatedChildrenArr();

    createPanelListItems();
    createChildrenPanel();

    choroplethMap();
    setMetricsPanels();
} //resetToDefault

function createMainFiltersTag(className) {
    const arr = uniqueValues("Partner_filtres_tag");
    const cleanedArr = formatArray(arr);

    $("." + className).html('');
    var spans = '';
    for (let index = 0; index < cleanedArr.length; index++) {
        const element = cleanedArr[index];
        spans += '<span class="tagLook tag">' + element + '</span>';
    }
    $("." + className).append(spans);

    $("." + className + " span").on("click", function(d) {
        const isSelected = $(this).hasClass('is-selected');
        if (!isSelected) {
            $(this).addClass('is-selected');
        } else {
            $(this).removeClass('is-selected');
        }
        // remove parent selections!
        updateDataFromFilters();

        updateViz();

    });
} //createMainFiltersTag

// parents clear or select all buttons
$(".item-selections button").on("click", function(d) {
    const buttonName = $(this).attr("class");
    if (buttonName == "select-all") {
        $(".collection-item li").each(function(index, li) {
            !$(li).hasClass('is-selected') ? $(li).addClass('is-selected') : null;
        });

    } else {
        $(".collection-item li").each(function(index, li) {
            $(li).hasClass('is-selected') ? $(li).removeClass('is-selected') : null;
        });
    }
    // clear filters
    //call reset viz?

    updateDataFromFilters();

    const childrenArr = getUpdatedChildrenArr();
    createChildrenPanel(childrenArr);

    choroplethMap();
    setMetricsPanels();
    // update map and metrics
})

// children filters clear or select all
$(".children-selections button").on("click", function(d) {
    const buttonName = $(this).attr("class");
    if (buttonName == "select-all") {
        $(".children li").each(function(index, li) {
            !$(li).hasClass('is-selected') ? $(li).addClass('is-selected') : null;
        });

    } else {
        $(".children li").each(function(index, li) {
            $(li).hasClass('is-selected') ? $(li).removeClass('is-selected') : null;
        });
    }
    // clear filters
    //call reset viz?

    updateDataFromFilters();

    choroplethMap();
    setMetricsPanels();
    // update map and metrics
})

function getSelectedItemFromUl(className) {
    var items = $("." + className + " li");
    var selections = [];
    items.each(function(idx, li) {
        const isSelected = $(li).hasClass('is-selected');
        const selection = d3.select(this).selectAll(".item").select("h6").text();
        isSelected ? selections.push(selection) : null;
    });
    for (let index = 0; index < selections.length; index++) {
        const element = selections[index];
        if (element == "monitoring & evaluation") {
            selections[index] = "monitoring_eval";
            break;
        }
    }
    return selections;
} //getSelectedItemFromUl


function getSelectedFilters() {
    var items = $(".parentFilters span");
    var selections = [];
    items.each(function(idx, span) {
        const isSelected = $(span).hasClass('is-selected');
        isSelected ? selections.push($(span).text()) : null;
    });
    return selections;
} //getSelectedFilters

function getPanelItemDetails(value) {
    const array = displayBy == "activity" ? parentsDetails : childrensDetails;
    var details;
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        if (element.key == value) {
            details = element.value;
            break;
        }
    }
    return details;
} //getPanelItemDetails

function getParentDetails(value) {
    const array = displayBy == "activity" ? parentsDetails : childrensDetails;
    var details;

    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        if (element.key == value || element.key == "monitoring & evaluation") {
            details = element.value;
            break;
        }
    }
    return details;

} //getParentDetails

function getChildDetails(value) {
    const array = displayBy == "activity" ? childrensDetails : parentsDetails;
    var details;
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        if (element.key == value || element.key == "monitoring_eval") {
            details = element.value;
            break;
        }
    }
    return details;

} //getChildDetails

function getParentBarChartData(dataArg = filteredMappingData) {
    const data = d3.nest()
        // .key(d => { return [d[config.Activity], d[config.Partner_short]] })
        .key(d => { return d[config.Activity] })
        .key(d => { return d[config.Partner_short] })
        .rollup(d => { return d.length })
        .entries(dataArg);

    let arr = [];
    data.forEach(element => {
        arr.push({ key: element.key, value: element.values.length })
    });
    arr = arr.sort(sortNestedData);
    return arr;
} //getParentBarChartData

function getChildBarChartData(dataArg = filteredMappingData) {
    const data = d3.nest()
        // .key(d => { return [d[config.Activity], d[config.Partner_short]] })
        .key(d => { return d[config.Partner_short] })
        .key(d => { return d[config.Activity] })
        .rollup(d => { return d.length })
        .entries(dataArg);

    let arr = [];
    data.forEach(element => {
        arr.push({ key: element.key, value: element.values.length })
    });
    arr = arr.sort(sortNestedData);
    return arr;
} //getParentBarChartData

function createBarChart(nestedData, parent = true) {
    const partialId = (parent) ? "bar-chart" : "bar-chart-child";
    const xScale = d3.scaleLinear()
        .domain([0, nestedData[0].value])
        .range([0, 210]);

    const width = 200;
    const height = 20;
    const margin = { top: 30, right: 40, bottom: 0, left: 14 };

    for (let index = 0; index < nestedData.length; index++) {
        const element = nestedData[index];
        const id = partialId + index;
        const wdth = xScale(element.value);
        let svg = d3.select('#' + id).append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('rect')
            .attr("height", height - 5)
            .transition().duration(200)
            .attr('width', wdth) //function(d) { return xScale(d.value) })
            .attr("x", 0)
            .attr("y", 0)
            .attr("fill", "#f0473a");
    }

} //createBarChart

function createPanelListItems(arr = parentsDefaultListArr) {

    $(".collection-item").html('');
    const hiddenClass = (!d3.select("#viewDetails").property("checked")) ? "hidden" : '';
    var lis = [];
    for (let index = 0; index < arr.length; index++) {
        const element = arr[index];

        const p = getParentDetails(element);
        const id = "bar-chart" + index;
        lis += '<li>' +
            '<div class="item">' +
            '<h6>' + element + '</h6>' +
            // '<p id="' + id + '"></p>' +
            '<div class="contenu ' + hiddenClass + '">' +
            '<p>' + p + '</p>' +
            '</div></div>' +
            '</li>';
    }
    $(".collection-item").append(lis);
    // const nestedData = getParentBarChartData();
    // createBarChart(nestedData);

    $(".collection-item li").on("click", function(d) {
        // const parentSelection = getSelectedItemFromUl("collection-item");
        const isSelected = $(this).hasClass('is-selected');
        if (!isSelected) {
            $(this).addClass('is-selected');
        } else {
            $(this).removeClass('is-selected');
        }
        // remove children selection
        //if a child was selected -> parent is filtered out, so should reinit parent arr but keep selection
        // console.log(parentSelection);
        d3.select(".children").selectAll("li").classed("is-selected", false);

        updateDataFromFilters();
        const childrenArr = getUpdatedChildrenArr();
        // console.log(childrenArr)
        createChildrenPanel(childrenArr);

        choroplethMap();
        setMetricsPanels();
    });
} //createPanelListItems

function createChildrenPanel(arr = childrenDefaultListArr) {
    $(".children").html('');
    const hiddenClass = (!d3.select("#viewDetails").property("checked")) ? "hidden" : null;
    var lis = [];
    for (let index = 0; index < arr.length; index++) {
        const element = arr[index];
        var p = getChildDetails(element);
        const id = "bar-chart-child" + index;
        lis += '<li>' +
            '<div class="item">' +
            '<h6>' + element + '</h6>' +
            // '<p id="' + id + '"></p>' +
            '<div class="contenu ' + hiddenClass + '">' +
            '<p>' + p + '</p>' +
            '</div>' +
            '</li>';
    }
    $(".children").append(lis);

    // const nestedData = getChildBarChartData();
    // createBarChart(nestedData, false);

    $(".children li").on("click", function(d) {
        const parentSelected = getSelectedItemFromUl("collection-item");
        const isSelected = $(this).hasClass('is-selected');
        if (!isSelected) {
            $(this).addClass('is-selected');
        } else {
            $(this).removeClass('is-selected');
        }

        updateDataFromFilters();

        if (parentSelected.length == 0) {
            const parentsArr = getUpdatedParentArr();
            createPanelListItems(parentsArr);
        }

        choroplethMap();
        setMetricsPanels();
        //update metrics

    });
} //createChildrenPanel

// on input change 

$('#viewDetails').change(function() {
    if (d3.select("#viewDetails").property("checked")) {
        d3.select('.collection-item').selectAll("li")
            .selectAll(".item")
            .selectAll(".contenu")
            .classed("hidden", false);

        d3.select('.children').selectAll("li")
            .selectAll(".item")
            .selectAll(".contenu")
            .classed("hidden", false);
        return;
    }
    d3.select('.collection-item').selectAll("li")
        .selectAll(".item")
        .selectAll(".contenu")
        .classed("hidden", true);
    d3.select('.children').selectAll("li")
        .selectAll(".item")
        .selectAll(".contenu")
        .classed("hidden", true);
});

$('input[type=radio][name="map-toggle"]').on("change", function(d) {
    if (d3.select("#orgs").property("checked")) {
        mapType = "orgs";
        d3.select(".map-title h6").text("# of partners per county");
    }
    if (d3.select("#vax").property("checked")) {
        mapType = "vax";
        d3.select(".map-title h6").text("% of people fully vaccinated");
    }

    // choroplethMap();
    resetToDefault();
});

// get each item p value
function getItemsDetails(whoCalled = "parent", item) {
    var p = "Lorem ipsum dolor sit amet consectetur adipisicing elit";
    if (whoCalled == "child") {
        const detailsCol = displayBy == "activity" ? "Partner" : "Activity";
        var detailArr,
            p;
        if (displayBy == "activity") {
            for (let index = 0; index < filteredMappingData.length; index++) {
                const val = filteredMappingData[index];
                if (val[config.Partner_short] == item) {
                    detailArr = val;
                    break;
                }
            }
            p = detailArr[config[detailsCol]];
        }
    }
    return p;
} //getItemsDetails

function getColumnUniqueValues(columnName, data = filteredMappingData, colInConfig = true, splitChart = " ") {
    var coloneName = colInConfig ? config[columnName] : columnName;
    var returnArr = [];
    data.forEach(element => {
        var arr = element[coloneName].split(splitChart);
        var trimedArr = arr.map(x => x.trim());
        trimedArr.forEach(d => {
            returnArr.includes(d.trim()) ? '' : returnArr.push(d.trim());
        });
    });
    var activityCountArr = [];
    returnArr.forEach(element => {
        var nb = 0;
        data.forEach(item => {
            const vals = splitMultiValues(item[coloneName]);
            for (let index = 0; index < vals.length; index++) {
                vals[index] == element ? nb++ : null;
            }
        });
        if (nb > 0) {
            activityCountArr.push({ key: element, value: nb });
        }
    });
    activityCountArr.sort(sortNestedData);
    var orderedArr = [];
    activityCountArr.forEach(act => {
        const acti = act.key == "monitoring_eval" ? "monitoring & evaluation" : act.key;
        orderedArr.push(acti);
    });
    return orderedArr;
} //getColumnUniqueValues

// get unique column values from the data
function uniqueValues(columnName, data = filteredMappingData) {
    const keyValArr = getNestedDataByColumn(columnName, data);
    var arr = [];

    keyValArr.forEach(element => {
        const key = element.key == "monitoring_eval" ? "monitoring & evaluation" : element.key;
        arr.push(key);
    });
    return arr;
}

function formatArray(arr) {
    var items = [];
    var trimedArr = arr.map(x => x.trim());
    for (let index = 0; index < trimedArr.length; index++) { //remove empty elements
        if (trimedArr[index]) {
            items.push(trimedArr[index]);
        }
    }
    return items;
} // formatArray

function splitMultiValues(arr) {
    const splitArr = arr.split(" ");
    var values = [];
    for (let index = 0; index < splitArr.length; index++) {
        values.push(splitArr[index]);
    }
    return values;
} //splitMultiValues

function findOneValue(emergenciesArrTest, arr) {
    return arr.some(function(v) {
        return emergenciesArrTest.indexOf(v) >= 0;
    });
};

function sortNestedData(a, b) {
    if (a.value > b.value) {
        return -1
    }
    if (a.value < b.value) {
        return 1
    }
    return 0;
} //sortNestedData

function updateDataFromFilters() {
    var data = mappingData;
    const parentFiltersArr = getSelectedFilters();
    const parentItemSelection = getSelectedItemFromUl("collection-item");
    const childrenItemSelection = getSelectedItemFromUl("children");

    if (parentFiltersArr.length > 0) {
        data = data.filter(function(d) {
            return parentFiltersArr.includes(d[config.Partner_filtres_tag]);
        });
    }

    if (parentItemSelection.length > 0) {
        const colFilter = displayBy == "activity" ? "Activity" : "Partner_short";
        data = data.filter(function(d) {
            return parentItemSelection.includes(d[config[colFilter]]);
        })

    }
    if (childrenItemSelection.length > 0) {
        const colFilter = displayBy == "activity" ? "Partner_short" : "Activity";
        data = data.filter(function(d) {
            return childrenItemSelection.includes(d[config[colFilter]]);
        });

    }

    if (countrySelectedFromMap != "") {
        data = data.filter(d => { return d[config.ISO3] == countrySelectedFromMap; })
    }
    filteredMappingData = data;
    return;
} //updateDataFromFilters

// metrics  
// const vaxColorRange = ['#FF0000', '#F97600', '#F6C600', '#2F9C67'];
const vaxColorRange = ['#f0473a', '#F97600', '#F6C600', '#2F9C67'];

const targetMinColor = "red",
    targetMaxcolor = "white";

function getCountyReport(county) {
    $("#countyReport").html('');
    var countyVax = "N/A",
        vaxSourceDate = "N/A";
    for (let index = 0; index < vaccinationData.length; index++) {
        const element = vaccinationData[index];
        if (element[config.vaccination.county_code] == county) {
            element[config.vaccination.percentage] != "" ? countyVax = element[config.vaccination.percentage] : null;
            element[config.vaccination.source_date] != "" ? vaxSourceDate = element[config.vaccination.source_date] : null;
            break;
        }
    }

    var divVax = '<div class="vax"><header>Vaccination</header>' +
        '<div id="vaxGauge"></div>' +
        '<div class="vax-block"><p id="vax-label">fully vaccinated</p></div>';
    // '<div class="vax-block"><p id="vax-pct">' + countyVax + '</p><p>fully vaccinated<p></div>';

    if (vaxSourceDate != "N/A") {
        divVax += '<div> <p class="vax-source">Source: MoH, ' + vaxSourceDate + '</p></div></div>';
    } else divVax += '</div>';

    const divs = '<div id="graphes">' + divVax +
        '<header>Activity coverage</header><div class="score"><p id="score">6/9</p></div></div>';
    $('#countyReport').append(divs);

    // const vaxgaugeChart = createVaxChart(countyVax);

    const filter = mappingData.filter(function(d) {
        return d[config["ISO3"]] == county;
    });
    const countyAct = uniqueValues("Activity", filter);
    var missingAct = [];
    for (let index = 0; index < activitiesAllArr.length; index++) {
        const element = activitiesAllArr[index];
        !countyAct.includes(element) ? missingAct.push(element) : null;

    }
    $('#score').text(String(countyAct.length) + "/" + String(activitiesAllArr.length));
    d3.select("#score").style("background", function() {
        if (countyAct.length <= 3) {
            return "#FF0000";
        }
        if (countyAct.length <= 7) {
            return "#F6C600";
        }
        if (countyAct.length > 7) {
            return "#2F9C67";
        }
        return "#ef6666";
    }); //"#ef6666"

    const vaxgaugeChart = createVaxChart(countyVax);
    // const gaugeChart = generateGauge(countyAct);

    var spans = '<p class="clearPadding">None</p>';
    if (missingAct.length > 0) {
        spans = '';
        for (let index = 0; index < missingAct.length; index++) {
            const element = missingAct[index];
            spans += '<span>' + element + '</span>';
        }
    }
    const missingActDiv = '<div class="missing"><header>Gap</header>' + spans + '</div>';
    $('#graphes').append(missingActDiv);
} //getCountyReport

function createVaxChart(vax) {
    var chart = c3.generate({
        bindto: '#vaxGauge',
        data: {
            columns: [
                ['data', vax]
            ],
            type: 'gauge'
        },
        gauge: {
            label: {
                format: function(value, ratio) {
                    return vax + "%";
                },
                show: false // to turn off the min/max labels.
            },
            width: 20 // for adjusting arc thickness
        },
        color: {
            pattern: vaxColorRange, //['#FF0000', '#F97600', '#F6C600', '#2F9C67'],
            threshold: {
                //            unit: 'value', // percentage is default
                //            max: 200, // 100 is default
                values: [25, 50, 90, 75]
            }
        },
        size: {
            height: 100
        },
        legend: {
            show: false
        },
        tooltip: {
            show: false
        }
    });
    return chart;
}


function setMetricsPanels(data = filteredMappingData) {

    const countriesArr = uniqueValues("ISO3", data);
    const orgsArr = uniqueValues("Partner_short", data);

    //overall
    d3.select('.keyFigures').select('#number1').text(orgsArr.length);
    d3.select('.keyFigures').select('#number2').text(countriesArr.length);


    //target population
    // const targetArr = getColumnUniqueValues("Target", data);
    // var targetColors = d3.scaleSequential()
    //     .domain([targetArr.length, 0])
    //     .interpolator(d3.interpolate("#FFF5F0", "#EE3224")); //d3.interpolateRgb("red", "blue")(0.5) //d3.interpolatePuRd fdebe9 

    // $('.target-pop').html('');

    // d3.select(".target-pop")
    //     .selectAll("span")
    //     .data(targetArr).enter()
    //     .append("span")
    //     .style("background", function(d, i) {
    //         return targetColors(i);
    //     })
    //     .text(function(d) { return d; });

    // contact
    $('.contact-details').html('<p>Select a partner!</p>');
    var contact = "<p>Select a partner!</p>"
    if (displayBy == "activity") {
        //contact should display if a children is-selected
        var selectedOrg = "";
        const selectedChild = getSelectedItemFromUl("children");
        if (selectedChild.length == 1) {
            selectedOrg = selectedChild[0];
        }

    } else {
        // contact should display if a parent is selected
        const selectedParent = getSelectedItemFromUl("collection-item");
        if (selectedParent.length == 1) {
            selectedOrg = selectedParent[0];
        }
    }
    if (selectedOrg != "") {
        for (let index = 0; index < filteredMappingData.length; index++) {
            const val = filteredMappingData[index];
            if (val[config.Partner_short] == selectedOrg) {
                contact = '<div class="name">' + val[config.Contact_name] + '</div>' +
                    '<div class="role">' + val[config.Contact_role] + '</div>' +
                    '<div class="email">E-mail</div>';
                break;
            }
        }

    }
    $('.contact-details').html(contact);
} //setMetricsPanels

function getUpdatedChildrenArr(data) {
    var arr;
    if (displayBy == "activity") {
        arr = uniqueValues("Partner_short", data);
    } else { //partner
        arr = getColumnUniqueValues("Activity", data);
    }
    return arr;
} //getUpdatedChildrenArr

function getUpdatedParentArr(data) {
    var arr;
    if (displayBy == "activity") {
        arr = getColumnUniqueValues("Activity", data);
    } else { //partner
        arr = uniqueValues("Partner_short", data);
    }
    return arr;
} //getUpdatedParentArr


function updateViz(data) {
    const parentsArr = getUpdatedParentArr(data);
    const childrenArr = getUpdatedChildrenArr(data);
    createPanelListItems(parentsArr);
    createChildrenPanel(childrenArr);

    choroplethMap(data);

    setMetricsPanels(data);
} //updateViz

function updateVizFromMap(data) {
    const parentFiltersArr = getSelectedFilters();
    if (parentFiltersArr.length > 0) {
        data = data.filter(function(d) {
            return parentFiltersArr.includes(d[config.Partner_filtres_tag]);
        });
    }
    const childrenArr = getUpdatedChildrenArr(data);

    updateViz(data);
} //updateVizFromMap

// map js
let isMobile = $(window).width() < 767 ? true : false;
let countriesArr = [];
let g, mapsvg, projection, width, height, zoom, path, maptip;
let viewportWidth = window.innerWidth;
let currentZoom = 1;
let mapFillColor = '#204669', //'#C2DACA',//'#2F9C67', 
    mapInactive = '#F2F2EF',
    mapActive = '#D90368',
    hoverColor = '#D90368',
    mapNotClickedColor = "#E9F1EA",
    mapClickedColor = '#ef6666'; //"#f0473a";
let countrySelectedFromMap = "";
// let mapColorRange = ['#fdebe9', '#fac2bd', '#f79992', '#f37066']; //, '#f0473a'];
// let mapColorRange = ['#E9F1EA', '#C2DACA', '#9EC8AE', '#78B794', '#2F9C67'];
let mapColorRange = ['#E9F1EA', '#9EC8AE', '#2F9C67'];
let mapScale = d3.scaleQuantize()
    .domain([0, 100])
    .range(mapColorRange);

function initiateMap() {
    width = viewportWidth - 560 - document.getElementById("rightSide").offsetWidth;
    // height = (isMobile) ? 400 : 500;
    height = 90;
    const mapPosition = width <= 503 ? [35.3, 7.5] : [33.5, 5.7];
    const mapZoomSize = width <= 503 ? 2500 : 3900;
    var mapScale = (isMobile) ? 2500 : mapZoomSize; //width * 8.5;
    var mapCenter = (isMobile) ? [12, 12] : mapPosition;
    projection = d3.geoMercator()
        .center(mapCenter)
        .scale(mapScale)
        .translate([width / 3.9, height / 2]);
    // .translate([-1000, -500]);

    path = d3.geoPath().projection(projection);
    zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);

    mapsvg = d3.select('#map').append("svg")
        .attr("width", width)
        .attr("height", height + "vh")
        .call(zoom)
        .on("wheel.zoom", null)
        .on("dblclick.zoom", null);

    mapsvg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "#fff");

    //map tooltips
    maptip = d3.select('#map').append('div').attr('class', 'd3-tip map-tip hidden');

    const countriesISO3Arr = uniqueValues("ISO3");
    g = mapsvg.append("g");
    g.attr('id', 'countries')
        .selectAll("path")
        .data(geomData.features)
        .enter()
        .append("path")
        .attr('d', path)
        .attr('fill', "#fff")
        .attr('stroke-width', .7)
        .attr('stroke', '#fff')
        .on("click", function(d) {
            // fix inactive but clickage bug
            if (d3.select(this).classed("inactive")) {
                return;
            }
            mapsvg.select('g').selectAll('.hasData')
                // .transition().duration(500)
                .attr('fill', mapNotClickedColor);
            $(this).attr('fill', mapClickedColor);
            $(this).addClass('clicked');
            countrySelectedFromMap = d.properties.ADM1_PCODE;
            const mapData = mappingData.filter(e => { return e[config["ISO3"]] == d.properties.ADM1_PCODE; });
            updateVizFromMap(mapData);
            createMapFilterSpan(d.properties.ADM1_EN);
            getCountyReport(d.properties.ADM1_PCODE);
        })
        .on("mouseenter", function(d) {
            if (mapType == "vax") {
                if (d3.select(this).classed("hasData")) {
                    const filter = vaccinationData.filter(v => { return v[config.vaccination.county_code] == d.properties.ADM1_PCODE });
                    const html = d.properties.ADM1_EN +
                        "</br>" +
                        filter[0][config.vaccination.percentage] + "% fully vaccinated";
                    const mouse = d3.mouse(this);
                    maptip
                        .classed('hidden', false)
                        .attr('style', 'left:' + (mouse[0] + 520) + 'px; top:' + (mouse[1]) + 'px')
                        .html(html);
                }
            }

        })
        .on("mouseout", function() {
            maptip.classed('hidden', true);
        });

    choroplethMap();

    //zoom controls
    d3.select("#zoom_in").on("click", function() {
        zoom.scaleBy(mapsvg.transition().duration(500), 1.5);
    });
    d3.select("#zoom_out").on("click", function() {
        zoom.scaleBy(mapsvg.transition().duration(500), 0.5);
    });


} //initiateMap

function mousemove(d) {
    const filter = vaccinationData.filter(v => { return v[config.vaccination.county_code] == d.properties.ADM1_PCODE });
    const html = d.properties.ADM1_EN +
        "</br>" +
        filter[0][config.vaccination.percentage] + "% fully vaccinated";
    const mouse = d3.mouse(this);
    maptip
        .classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 520) + 'px; top:' + (mouse[1]) + 'px')
        .html(html);
} //mousemove

// zoom on buttons click
function zoomed() {
    const { transform } = d3.event;
    currentZoom = transform.k;

    if (!isNaN(transform.k)) {
        g.attr("transform", transform);
        g.attr("stroke-width", 1 / transform.k);

        // updateCerclesMarkers()
    }
}

function createMapFilterSpan(country) {
    var spans = "";
    $(".map-filter").html("");
    if (countrySelectedFromMap != "") {
        spans += '<span id="country-name">' + country + ' county</span>';
        spans += '<button>Reset map</button>';
        $(".map-filter").append(spans);

        $('.map-filter button').on("click", function() {
            resetToDefault();
        });
        return;
    }
}

function getNestedDataByColumn(col, data = filteredMappingData) {
    var data = d3.nest()
        .key(function(d) { return d[config[col]]; })
        .rollup(function(d) { return d.length; })
        .entries(data).sort(sortNestedData);
    return data;
} //getNestedDataByColumn

function getActivitiesCounties(data = filteredMappingData) {
    const actArr = ["coordination"]; //formatArray(getColumnUniqueValues("Activity"));
    var countiesArr = [];
    if (actArr.length > 0) {
        for (let index = 0; index < actArr.length; index++) {
            const countyCol = actArr[index] + "_county";
            const actCounties = getColumnUniqueValues(countyCol, data, false);
            countiesArr.push(...actCounties);
        }
    }
    return formatArray(countiesArr);
} //getActivitiesCounties

function generateDataForMap(mapData = filteredMappingData) {
    var data = d3.nest()
        .key(function(d) { return d[config.ISO3]; })
        .rollup(function(d) { return d.length; })
        .entries(mapData).sort(sortNestedData);
    return data;
} //generateDataForMap

function createMapLabels(data = mappingData) {
    // remove existing labels
    g.selectAll("text").remove();

    const mapElementsArr = formatArray(uniqueValues("ISO3", data));
    const geomDataLabels = geomData.features.filter(function(d) {
        return mapElementsArr.includes(d.properties.ADM1_PCODE);
    });
    g.selectAll(".country-label")
        .data(geomDataLabels)
        .enter().append("text")
        .attr("class", "country-label")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .text(function(d) { return d.properties.ADM1_EN; })
        .on("click", function(d) {
            // fix inactive but clickage bug
            if (d3.select(this).classed("inactive")) {
                return;
            }
            mapsvg.select('g').selectAll('.hasData').attr('fill', mapNotClickedColor);
            mapsvg.select('g').selectAll('.hasData').each(function(f) {
                if (d.properties.ADM1_PCODE == f.properties.ADM1_PCODE) {
                    d3.select(this).transition().duration(500).attr('fill', mapClickedColor);
                    d3.select(this).classed("clicked", true);
                }
            })

            countrySelectedFromMap = d.properties.ADM1_PCODE;
            const mapData = mappingData.filter(e => { return e[config["ISO3"]] == d.properties.ADM1_PCODE; });
            updateVizFromMap(mapData);
            createMapFilterSpan(d.properties.ADM1_EN);
            getCountyReport(d.properties.ADM1_PCODE);
        });

} //createMapLabels

function choroplethMap(mapData = filteredMappingData) {
    let className = "hasData";
    let legendTitle = "# organisations";
    let countriesArr = [];
    let legendRange = mapColorRange;

    let data = orgCount(mapData);

    data.forEach(element => {
        countriesArr.push(element.key);
    });
    countriesArr = formatArray(countriesArr);

    mapScale = d3.scaleQuantize()
        .domain([0, data[0].values.length])
        .range(legendRange);

    if (countrySelectedFromMap != "") {
        return;
    }

    if (mapType == "vax") {
        className = "hasVax";
        let vaxData = vaccinationData;
        if (mapData != undefined) {
            vaxData = vaccinationData.filter(function(d) {
                return countriesArr.includes(d[config.vaccination.county_code]);
            })
        }
        data = d3.nest()
            .key(d => { return d[config.vaccination.county_code]; })
            .key(d => { return d[config.vaccination.percentage]; })
            .rollup(d => { return d.length })
            .entries(vaxData);
        // setup  range color and scale to use
        legendRange = vaxColorRange;
        mapScale = d3.scaleQuantize()
            .domain([0, 100])
            .range(legendRange);
        legendTitle = "Vaccination"
            // return;
    }
    // if (mapType == "orgs") {

    //     data = orgCount(mapData);
    // }
    // data = orgCount();

    mapsvg.selectAll('path').each(function(element, index) {
        d3.select(this).transition().duration(500).attr('class', function(d) {
            var className = (countriesArr.includes(d.properties.ADM1_PCODE)) ? 'hasData' : 'inactive';
            return className;
        });
        d3.select(this).transition().duration(500).attr('fill', function(d) {
            var filtered = data.filter(pt => pt.key == d.properties.ADM1_PCODE);
            var num = null;
            if (filtered.length != 0) {
                if (mapType == "vax") {
                    num = filtered[0].values[0].key;
                } else num = filtered[0].values.length;
            }
            // var num = (filtered.length != 0) ? filtered[0].values.length : null;
            var clr = (num == null) ? mapInactive : mapScale(num);
            return clr;
        });
    });

    createMapLabels(mapData);

    const legend = d3.legendColor()
        .labelFormat(d3.format(',.0f'))
        .title(legendTitle)
        .cells(legendRange.length)
        .scale(mapScale);
    d3.select('#legend').remove();

    var div = d3.select('.legend');
    var svg = div.append('svg')
        .attr('id', 'legend')
        .attr('width', '90px')
        .attr('height', '90px');

    svg.append('g')
        .attr('class', 'scale')
        .call(legend);


} //choroplethMap

function orgCount(dataArg = filteredMappingData) {
    var data = d3.nest()
        .key(function(d) { return d[config.ISO3]; })
        .key(function(d) { return d[config.Partner_short]; })
        .rollup(function(d) { return d.length; })
        .entries(dataArg).sort(function(a, b) {
            if (a.values.length > b.values.length) {
                return -1
            }
            if (a.values.length < b.values.length) {
                return 1
            }
            return 0;
        });
    return data;
}