// 'CRIMINAL SEXUAL ASSAULT',                           'BATTERY',
//                              'THEFT',               'MOTOR VEHICLE THEFT',
//                      'OTHER OFFENSE',                   'CRIMINAL DAMAGE',
//                          'NARCOTICS',              'LIQUOR LAW VIOLATION',
//         'OFFENSE INVOLVING CHILDREN',                           'ROBBERY',
//                 'DECEPTIVE PRACTICE',                           'ASSAULT',
//                  'CRIMINAL TRESPASS',                          'BURGLARY',
//                  'WEAPONS VIOLATION',  'INTERFERENCE WITH PUBLIC OFFICER',
//  'CONCEALED CARRY LICENSE VIOLATION',                        'KIDNAPPING',
//                           'STALKING',            'PUBLIC PEACE VIOLATION',
//                       'INTIMIDATION',                      'PROSTITUTION',
//                           'HOMICIDE',                       'SEX OFFENSE',
//                          'OBSCENITY',                             'ARSON',
//                  'HUMAN TRAFFICKING',                  'PUBLIC INDECENCY',
//                           'GAMBLING',          'OTHER NARCOTIC VIOLATION',
//                       'NON-CRIMINAL',                         'RITUALISM',
//                'CRIM SEXUAL ASSAULT',                 'DOMESTIC VIOLENCE'


const width = 1500;
const height = 800;
const crimeTypes = ['CRIMINAL SEXUAL ASSAULT','BATTERY','THEFT','MOTOR VEHICLE THEFT','OTHER OFFENSE','CRIMINAL DAMAGE','NARCOTICS','LIQUOR LAW VIOLATION',
'OFFENSE INVOLVING CHILDREN','ROBBERY','DECEPTIVE PRACTICE','ASSAULT','CRIMINAL TRESPASS','BURGLARY','WEAPONS VIOLATION','INTERFERENCE WITH PUBLIC OFFICER',
'CONCEALED CARRY LICENSE VIOLATION','KIDNAPPING','STALKING','PUBLIC PEACE VIOLATION', 'INTIMIDATION','PROSTITUTION','HOMICIDE','SEX OFFENSE','OBSCENITY','ARSON',
'HUMAN TRAFFICKING','PUBLIC INDECENCY','GAMBLING','OTHER NARCOTIC VIOLATION','NON-CRIMINAL','RITUALISM','CRIM SEXUAL ASSAULT','DOMESTIC VIOLENCE'];

const colors =["#1F77B4","#FF7F0E","#2CA02C","#D62728","#9467BD","#8C564B","#E377C2","#7F7F7F","#BCBD22","#17BECF",
  "#393B79","#637939","#8C6D31","#843C39","#7B4173","#3182BD","#31A354","#756BB1","#636363","#E6550D","#969696",
  "#9C9EDE","#CEDB9C","#E7BA52","#E7969C","#C7C7C7","#DBDB8D","#9EDAE5","#FF9896","#98DF8A","#AEC7E8","#FFBB78",
  "#C5B0D5","#F7B6D2"
];

const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

const g = svg.append("g");


// creates the legend for the crime types using the color scale and d3-legend library
const colorScale = d3.scaleOrdinal()
    .domain(crimeTypes)
    .range(colors);
    

const legendColor = d3.legendColor()
  .title("Crime Types")
  .scale(colorScale)
  .shape("rect")
  .shapeWidth(14)
  .shapeHeight(14)
  .shapePadding(4)
  .labelOffset(6)
  .cells(crimeTypes);

const legend = svg.append("g")
  .attr("class", "legendColor")
  .attr("transform", "translate(250, 15) scale (0.95)")
  .call(legendColor);

legend.select(".legendTitle")
  .style("font-size", "20px")
  .style("font-weight", "600");

// setting up the map projection and path generator of Chicago using the GeoJSON data
const chicago = await d3.json("./data/chicago-community-areas.geojson");

// grabs a projection of chicago and scales it to fit the width and height specified

const margin = { top: 80, right: 30, bottom: 30, left: 20 };
const mapH = height - margin.top - margin.bottom;

const projection = d3.geoMercator()
        .fitSize([width, mapH], chicago);

const path = d3.geoPath().projection(projection);

g.selectAll("path")
    .data(chicago.features ? chicago.features : [chicago]) // works for FeatureCollection or single Feature
    .join("path")
    .attr("d", path)
    .attr("fill", "#f2f2f2")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.7)
    .attr("transform", "translate(200, 0)");


// process the .csv file and visualize the crime data
// !!! aparently the json file is in the [long, lat] order rather than the lat long

const crimeData = await d3.csv("./data/sample_by_year.csv", (d) => {
    const lat = +d.Latitude;
    const lon = +d.Longitude;
    const year = +d.Year;
    const crime = (d["Primary Type"] ?? d.crime ?? d.Crime ?? "").trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(year) || !crime) {
        return null; // skip invalid rows
    }

    return { lat, lon, year, crime };
});

// set up the slider for selecting the year range (2001-2026)
const sliderSvg = d3.select("#slider")
  .append("svg")
  .attr("width", width)
  .attr("height", 100);

const yearSlider = d3.sliderBottom()
  .min(2001)
  .max(2026)
  .step(1)
  .width(300)
  .tickFormat(d3.format("d"))
  .ticks(7)
  .default(2001)
  .on("onchange", (val) => {
    console.log("year:", val);
  });

sliderSvg.append("g")
  .attr("transform", "translate(" + (width - 580) / 2 + ",30) scale(1.2)") // center the slider and scale it up
  .call(yearSlider);
