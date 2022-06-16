//BRR
let geodataUrl = 'data/ken_counties.json';
let fourWDataUrl = 'data/data.csv';
let configFileURL = 'data/config.json';
let geomData,
    mappingData,
    filteredMappingData,
    config;

let parentsDefaultListArr = [],
    childrenDefaultListArr = [];

let parentsDetails = [],
    childrensDetails = [];

let displayBy = "activity";

let activitiesAllArr, maxAct;

$(document).ready(function() {
    function getData() {
        Promise.all([
            d3.json(geodataUrl),
            d3.csv(fourWDataUrl),
            d3.json(configFileURL)
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


            setLastUpdatedDate();

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
            $('#main').css('opacity', 1);
        }); // then
    } // getData

    getData();
});

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
        console.log(element)
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
        if (element.key == value) {
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
        if (element.key == value) {
            details = element.value;
            break;
        }
    }
    return details;

} //getChildDetails

function createPanelListItems(arr = parentsDefaultListArr) {
    $(".collection-item").html('');
    const hiddenClass = (!d3.select("#viewDetails").property("checked")) ? "hidden" : null;
    var lis = [];
    for (let index = 0; index < arr.length; index++) {
        const element = arr[index];
        const p = getParentDetails(element);
        lis += '<li>' +
            '<div class="item">' +
            '<h6>' + element + '</h6>' +
            '<div class="contenu ' + hiddenClass + '">' +
            '<p>' + p + '</p>' +
            '</div></div>' +
            '</li>';

    }
    $(".collection-item").append(lis);

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

        lis += '<li>' +
            '<div class="item">' +
            '<h6>' + element + '</h6>' +
            '<div class="contenu ' + hiddenClass + '">' +
            '<p>' + p + '</p>' +
            '</div>' +
            '</li>';
    }
    $(".children").append(lis);

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
        arr.push(element.key);
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

const targetMinColor = "red",
    targetMaxcolor = "white";

function getCountyReport(county) {
    $("#countyReport").html('');

    const divs = '<div id="graphes"><p>Activity Gap</p><div id="gauge"></div>';
    $('#countyReport').append(divs + '</div>');

    const filter = mappingData.filter(function(d) {
        return d[config["ISO3"]] == county;
    });
    const countyAct = uniqueValues("Activity", filter);
    var missingAct = [];
    for (let index = 0; index < activitiesAllArr.length; index++) {
        const element = activitiesAllArr[index];
        !countyAct.includes(element) ? missingAct.push(element) : null;

    }
    const gaugeChart = generateGauge(countyAct);
    if (missingAct.length > 0) {
        var spans = '';
        for (let index = 0; index < missingAct.length; index++) {
            const element = missingAct[index];
            spans += '<span>' + element + '</span>';
        }
        const missingActDiv = '<div class="missing"><p>Missing activities</p>' + spans + '</div>';
        $('#graphes').append(missingActDiv);
    }


} //getCountyReport

function generateGauge(arr) {
    const val = arr.length;
    var chart = c3.generate({
        bindto: '#gauge',
        data: {
            columns: [
                ['data', val]
            ],
            type: 'gauge',
            // onclick: function (d, i) { console.log("onclick", d, i); },
            // onmouseover: function (d, i) { console.log("onmouseover", d, i); },
            // onmouseout: function (d, i) { console.log("onmouseout", d, i); }
        },
        gauge: {
            label: {
                format: function(value, ratio) {
                    return val + "/" + maxAct; //d3.format('d')(value);
                },
                //            show: false // to turn off the min/max labels.
            },
            min: 0, // 0 is default, //can handle negative min e.g. vacuum / voltage / current flow / rate of change
            max: maxAct, // 100 is default
            units: '',
            //    width: 39 // for adjusting arc thickness
        },
        color: {
            pattern: ['#FF0000', '#F97600', '#F6C600', '#2F9C67'], //, '#60B044'], // the three color levels for the percentage values.
            threshold: {
                unit: 'value', // percentage is default
                max: maxAct, // 100 is default
                values: [3, 5, 9]
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
    })
    return chart;
}

function setMetricsPanels(data = filteredMappingData) {
    // if (countrySelectedFromMap != "") {
    //     $("#countyReport").html('');
    // }
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
let g, mapsvg, projection, width, height, zoom, path;
let viewportWidth = window.innerWidth;
let currentZoom = 1;
let mapFillColor = '#204669', //'#C2DACA',//'#2F9C67', 
    mapInactive = '#F2F2EF',
    mapActive = '#D90368',
    hoverColor = '#D90368',
    mapNotClickedColor = "#E9F1EA",
    mapClickedColor = "#f0473a";
let countrySelectedFromMap = "";
// let mapColorRange = ['#fdebe9', '#fac2bd', '#f79992', '#f37066']; //, '#f0473a'];
let mapColorRange = ['#E9F1EA', '#C2DACA', '#9EC8AE', '#78B794', '#2F9C67'];
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
    var maptip = d3.select('#map').append('div').attr('class', 'd3-tip map-tip hidden');

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
        spans += '<span id="country-name">' + country + '</span>';
        spans += '<button>Clear selection</button>';
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

function createMapLabels(data = filteredMappingData) {
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

    if (countrySelectedFromMap != "") {
        return;
    }
    const data = getNestedDataByColumn("ISO3", mapData);
    var countriesArr = [];
    data.forEach(element => {
        countriesArr.push(element.key);
    });
    countriesArr = formatArray(countriesArr);
    var max = data[0].value;
    mapsvg.selectAll('path').each(function(element, index) {
        d3.select(this).transition().duration(500).attr('class', function(d) {
            var className = (countriesArr.includes(d.properties.ADM1_PCODE)) ? 'hasData' : 'inactive';
            return className;
        });
        d3.select(this).transition().duration(500).attr('fill', function(d) {
            var filtered = data.filter(pt => pt.key == d.properties.ADM1_PCODE);
            var num = (filtered.length != 0) ? filtered[0].value : null;
            var clr = (num == null) ? mapInactive : mapScale(Math.round((num * 100) / max));
            return clr;
        });
    });
    createMapLabels(mapData);

} //choroplethMap