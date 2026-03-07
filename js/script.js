let points = null;
const width = 1500;
const height = 800;
const legendWidth = 620;
const mapWidth = width - legendWidth;
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
    .attr('width', mapWidth)
    .attr('height', height);

const g = svg.append("g");

const viewport = g.append("g"); // map and points layer
const brushLayer = g.append("g"); // separate brush layer
let mode = "brush"; // default is brush, but could also be pan

// creates the legend for the crime types using the color scale and d3-legend library
const colorScale = d3.scaleOrdinal()
    .domain(crimeTypes)
    .range(colors);
const activeCrimeTypes = new Set(crimeTypes); // all checked / in set  by default
    
const legendSvg = d3.select("#legend")
    .append("svg")
    .attr("width", legendWidth)
    .attr("height", height);

const legendColor = d3.legendColor()
  .title("Crime Types")
  .scale(colorScale)
  .shape("rect")
  .shapeWidth(14)
  .shapeHeight(14)
  .shapePadding(4)
  .labelOffset(6)
  .cells(crimeTypes);

const legend = legendSvg.append("g")
  .attr("class", "legendColor")
  .attr("transform", "translate(250, 15) scale (0.95)")
  .call(legendColor);

legend.select(".legendTitle")
  .style("font-size", "20px")
  .style("font-weight", "600");


// checkbox on left side
legend.selectAll(".cell")
  .append("foreignObject")
  .attr("x", -25)
  .attr("y", -6)
  .attr("width", 20)
  .attr("height", 20)
  .append("xhtml:input")
  .attr("type", "checkbox")
  .property("checked", true) // checked by def.
  .on("change", 
    function (event, crime) {
    if (!crime) return;
    if (this.checked) activeCrimeTypes.add(crime); else activeCrimeTypes.delete(crime);
    const year = yearSlider.value();
    renderPoints(year);
    updateViews(crimeData.filter(d =>
      d.year === year &&
      activeCrimeTypes.has(d.crime)
    ));
  });

// setting up the map projection and path generator of Chicago using the GeoJSON data
const chicago = await d3.json("./data/chicago-community-areas.geojson");

// grabs a projection of chicago and scales it to fit the width and height specified

const margin = { top: 80, right: 30, bottom: 30, left: 20 };
const mapH = height - margin.top - margin.bottom;
const xOffset = 20; // adjust this value to move the map right

const projection = d3.geoMercator()
        .fitSize([mapWidth - 50, mapH], chicago);

const path = d3.geoPath().projection(projection);

viewport.selectAll("path")
    .data([chicago])
    .join("path")
    .attr("class", "chicagoMap")
    .attr("d", path)
    .attr("fill", "#f2f2f2")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.7)
    .attr("transform", `translate(${xOffset}, 0)`);


// creates the zoom behavior for the map 
const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", (event) => {
    if (mode != "pan") return;
    viewport.attr("transform", event.transform);
});

// process the .csv file and visualize the crime data

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


// creates a tooltip
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// set up the slider for selecting the year range (2001-2026)
const sliderSvg = d3.select("#slider")
  .append("svg")
  .attr("width", 500)
  .attr("height", 100);

const yearSlider = d3.sliderBottom()
  .min(d3.min(crimeData, d => d.year))
  .max(d3.max(crimeData, d => d.year))
  .step(1)
  .width(300)
  .tickFormat(d3.format("d"))
  .ticks(7)
  .default(2001)
  .on("onchange", (val) => {
    renderPoints(val);
    updateViews(crimeData.filter(d => d.year === val && activeCrimeTypes.has(d.crime)));
  });

renderPoints(2001);

sliderSvg.append("g")
  .attr("transform", "scale(1.4)")
  .call(yearSlider);


function renderPoints(year) {
  const filtered = crimeData.filter(d => d.year === year && activeCrimeTypes.has(d.crime));

  const time = g.transition().duration(450);

  points = viewport.selectAll("circle")
    .data(filtered, d => `${d.year}-${d.lat}-${d.lon}-${d.crime}`)
    .join(
      enter => enter.append("circle")
      .attr("cx", d => projection([d.lon, d.lat])[0] + xOffset)
      .attr("cy", d => projection([d.lon, d.lat])[1])
      .attr("fill", d => colorScale(d.crime))
      .attr("r", 0)
      .attr("opacity", 0)
      .on("mouseover", (event, d) => {
        tooltip.style("opacity", 1)
          .html(d.crime + "</b><br/>Year: " + d.year + "<br/>(" + d.lat.toFixed(3) + ", " + d.lon.toFixed(3) + ")");
        d3.select(event.currentTarget).attr("stroke-width", 1.5);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY + 12) + "px");
      })
      .on("mouseout", (event) => {
        tooltip.style("opacity", 0);
        d3.select(event.currentTarget).attr("stroke-width", 0);
      })
      .call(enter => enter.transition(time)
        .attr("r", 3)
        .attr("opacity", 0.7)
        ),
      update => update
      .call(update => update.transition(time)
        .attr("cx", d => projection([d.lon, d.lat])[0] + xOffset)
        .attr("cy", d => projection([d.lon, d.lat])[1])
        .attr("fill", d => colorScale(d.crime))
        .attr("r", 3)
        .attr("opacity", 0.7)
        ),
      exit => exit
        .transition(time)
        .attr("r", 0)
        .attr("opacity", 0)
        .remove()
        );
}


// establish a connection within the dataset

const brush = d3.brush().extent([[xOffset, 0], [xOffset + width, mapH]]).on("brush end", brushed);
const brushG = brushLayer.append("g")
  .attr("class", "brush")
  .call(brush);

function brushed(event, year){
  if (!points) return;

  const selection = event.selection;
  if (!selection){
    const year = yearSlider.value();
    points.classed("selected", false).attr("opacity", 0.6);
    updateViews(crimeData.filter(d => d.year === year && activeCrimeTypes.has(d.crime)));
    return;
  }

  const [[x, y], [x2, y2]] = selection;
  const selected = [];

  points.each(function (d){
    const cx = +d3.select(this).attr("cx");
    const cy = +d3.select(this).attr("cy");


    const box = x <= cx && cx <= x2 && y <= cy && cy <= y2;

    d3.select(this).classed("selected", box).attr("opacity", box ? 1 : 0.15).sort((a,b) => d3.descending(a.count, b.count));

    if (box) selected.push(d);

  });
  updateViews(selected);
}

function updateViews(data){
  const crimeCount = d3.rollups(
    data, 
    v => v.length,
    d => d.crime)
    .map(([crime, count]) => ({crime, count}))
    
    barChartTitle.text(`Top 10 Crimes in selected area for year ${yearSlider.value()}`);
    renderBars(crimeCount);
}

const barMargin = { top: 30, right: 20, bottom: 100, left: 80 };
const barH = height - barMargin.top - barMargin.bottom;
const barW = width - barMargin.left - barMargin.right;
const barChartSvg = d3.select('#bar-vis')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

const barG = barChartSvg.append('g').attr("transform", `translate(${barMargin.left},${barMargin.top})`);
const xAxisG = barG.append('g').attr("class", "x-axis").attr("transform", `translate(0, ${barH})`)
const yAxisG = barG.append('g').attr("class", "y-axis")

barChartSvg.append('text')
      .attr('class', 'axis-label')
      .attr('x', (barW / 2) + 50 )
      .attr('y', barH + 125)
      .style('text-anchor', 'middle')
      .text('Crime Types')
      .style("font-weight", "bold")
      .style("font-size", "20");
      

  barChartSvg.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -barH / 2)
      .attr('y', barMargin.left - 40)
      .style('text-anchor', 'middle')
      .text('Count')
      .style("font-weight", "bold")
      .style("font-size", "20");;

const barChartTitle = barChartSvg.append("text")
  .attr("x", width / 2)
  .attr("y", 24)
  .style("text-anchor", "middle")
  .style("font-size", "20px")
  .style("font-weight", "bold");

function renderBars(crimeCount){

  console.log(crimeCount);
  const data = crimeCount.slice(0, 10);
  data.sort((a, b) => d3.descending(a.count, b.count));

  const xScale = d3.scaleBand().domain(data.map(d => d.crime)).range([0 , barW])
  const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.count) ?? 0]).range([barH, 0]);

  barG.selectAll("rect")
  .data(data, d => d.crime)
  .join(
    enter => enter.append("rect")
      .attr("x", d => xScale(d.crime))
      .attr("width", xScale.bandwidth())
      .attr("y", barH)     
      .attr("height", 0)
      .attr("opacity", 0.85)
      .attr("y", d => yScale(d.count))
      .attr("height", d => barH - yScale(d.count))
      .attr("fill", d => colorScale(d.crime))
      .attr("stroke", "black"),

    update => update
      .attr("x", d => xScale(d.crime))
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d.count))
      .attr("height", d => barH - yScale(d.count)),

    exit => exit
      .attr("y", barH)
      .attr("height", 0)
      .remove()
  );


  xAxisG.call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .style("text-anchor", "end");

  yAxisG.call(d3.axisLeft(yScale));

}

updateViews(crimeData.filter(d => d.year === 2001))


// functionality to toggle between brush and pan mode.
function setMode(newMode) {
  mode = newMode;

  if (mode === "pan") {
    brushG.call(brush.move, null);
    brushG.style("pointer-events", "none"); // disable brush interactions
    brushG.selectAll(".overlay,.selection,.handle").style("display", "none"); // hide brush elements
    svg.call(zoom);
  } else {
    svg.on(".zoom", null); // disable zoom and pan

    // move map back to original spot
    svg.transition().duration(200).call(zoom.transform, d3.zoomIdentity); 
    viewport.attr("transform", d3.zoomIdentity);

    // enable brushing again
    brushG.style("pointer-events", "all");
    brushG.selectAll(".overlay,.selection,.handle").style("display", null);
  }
  d3.select("#brushModeBtn").classed("active", mode === "brush");
  d3.select("#panModeBtn").classed("active", mode === "pan");
}

d3.select("#brushModeBtn").on("click", () => setMode("brush"));
d3.select("#panModeBtn").on("click", () => setMode("pan"));

setMode("brush");