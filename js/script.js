/*globals d3,topojson*/
'use strict';



var now = Date.now(),
    timeDiff,
    lastTick = Date.now();

var options = {
    speedFactor: 0.04,
    lifeTime: 1000,
    lineWidth: 1,
    colorAlpha: 0.6,
    globalAlpha: 0.94,
    color: [
       '71,132,255',
       '110,118,233',
       '149,105,211',
       '189,92,190',
       '228,79,168',
       '255,71,154'
    ],
    criterion: 'temp2m'
};


var t, s;
var mouseBuffer = {x: 0, y: 0};




var width = document.querySelector('.container').clientWidth,
    height = document.querySelector('.container').clientHeight;

var grid_center = {lat: 47.5, lon: 4};

var projection = d3.geo.conicConformal()
                .center([47.5, 4])
                .scale(width)
                .rotate([-grid_center.lon, 0])
                .parallels([47.5, 47.5])
                .translate([width, height])
                .precision(0.1);

// var projection = d3.geo.mercator()
//     .scale(width)
//     .center([47.5, 4])
//     .rotate([-grid_center.lon, 0])
//     .translate([width, height])
//     .precision(.1);






// var projection = d3.geo.mercator();

var path = d3.geo.path()
.projection(projection);

var zoom = d3.behavior.zoom()
    .center([width/2, height/2])
    .scaleExtent([0, 3])
    .on("zoom", move);


var graticule = d3.geo.graticule()
    .extent([[-90,0], [90, 90]])
    .step([5, 5]);

var svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
       .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
       .call(zoom);
var g = svg.append('g');


// var center = projection([grid_center.lon, grid_center.lat]),
//     bottomLeft = projection([-24.6064, 26.3683]),
//     topRight = projection([4 + (4 + 24.6064), (47.5 + (47.5 - 26.3683))]); // 48, 60


var countries = g.append('g').attr('class', 'countries');

var graticulePath = g.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path);

var cursor = g.append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 5)
    .attr('class', 'cursor');




var container = document.querySelector('.container'),
    canvas = [],
    ctx = [],
    buffer = document.createElement('canvas'),
    bufferCtx = buffer.getContext('2d'),
    tempCanvas,
    tempCtx;


var dataLoaded = false;


var projTopLeft, projBottomRight;
var gridSize;
var corners;

d3.json('data/data.json', function(err, data) {

    window.data = data;

    gridSize = {
        x: data.lat[0].length - 1,
        y: data.lat.length - 1
    };

    /** Data
     *    ^
     *  y |
     *    0 —->
     *      x
     */
    corners = {
        topLeft: [data.lon[gridSize.y][0], data.lat[gridSize.y][0]],
        topRight: [data.lon[gridSize.y][gridSize.x], data.lat[gridSize.y][gridSize.x]],
        bottomLeft: [data.lon[0][0], data.lat[0][0]],
        bottomRight: [data.lon[0][gridSize.x], data.lat[0][gridSize.x]],
    };

    projTopLeft = projection(corners.topLeft);
    projBottomRight = projection(corners.bottomRight);


    /**
     * Draw control dataframe
     */
    g.append('polyline')
        .attr('class', 'dataframe')
        .attr('points', [
               projection(corners.topLeft),
               projection(corners.topRight),
               projection(corners.bottomRight),
               projection(corners.bottomLeft),
               projection(corners.topLeft)
           ].map(function (item) { return item.toString(); }).join(' '));


    dataLoaded = true;

    move();
    setupCanvas();

});


var canvasDim, canvasOffset;
move();



d3.json('data/world-50m.json', function(error, world) {

    countries.selectAll('path')
       .data(topojson.feature(world, world.objects.countries).features)
       .enter().append('path')
            // .attr('class', 'country')
            .attr('class', function(d,i) { return 'country countr-' + d.id; })
            .attr('d', path);

});





function move() {

    if (d3.event) {
       t = d3.event.translate;
       s = d3.event.scale;
    } else {
       t = [0,0];
       s = 1;
    }


    // var originalT = [t[0], t[1]];
    // mouseBuffer.x = originalT[0] - t[0];
    // mouseBuffer.y = originalT[1] - t[1];
    // t[0] = clamp(t[0] - mouseBuffer.x, (width - canvasDim.width) / 2, -(width - canvasDim.width) / 2);
    // t[1] = clamp(t[1] - mouseBuffer.y, (height - canvasDim.height) / 2, -(height - canvasDim.height) / 2);
    // if (width > canvasDim.width) {
    //     t[0] = 0;
    // }
    // if (height > canvasDim.height) {
    //     t[1] = 1;
    // }


    g.style("stroke-width", 1 / s).attr("transform", "translate(" + [t[0],t[1]] + ")scale(" + s + ")");

    graticulePath.style('stroke-width', 1/s);

    for (var i = 0; i < ctx.length; i++) {
        ctx[i].clearRect(0,0,canvas[i].width, canvas[i].height);
    }

    if (dataLoaded) {

        canvasDim = {
           width: (projBottomRight[0] - projTopLeft[0]) * s,
           height: -(projTopLeft[1] - projBottomRight[1]) * s
        };
        canvasOffset = {
           x: width / 2 + projTopLeft[0] * s + t[0],
           y: height / 2 + projTopLeft[1] * s + t[1]
        };

    }

}



function resizeCanvas() {
    var windowAspectRatio = window.innerWidth / window.innerHeight,
       containerAspectRatio = container.clientWidth / container.clientHeight;

    if (windowAspectRatio > containerAspectRatio) {
        container.style.width = (window.innerHeight * containerAspectRatio) + 'px';
        container.style.height = window.innerHeight + 'px';
    } else {
        container.style.width = window.innerWidth + 'px';
        container.style.height = (window.innerWidth / containerAspectRatio) + 'px';
    }

    // TODO..........
    container.style.width = width + 'px';
    container.style.height = height + 'px';


    for (var i = 0; i < canvas.length; i++) {
        canvas[i].width = document.querySelector('.container').clientWidth;
        canvas[i].height = document.querySelector('.container').clientHeight;
        // ctx[i].setTransform(canvasMapWidth / canvas[i].width, 0, (canvas[i].width - canvasMapWidth) / 2,
        // canvasMapHeight / canvas[i].height, 0, (canvas[i].height - canvasMapHeight) / 2);
    }

    buffer.width = document.querySelector('.container').clientWidth;
    buffer.height = document.querySelector('.container').clientHeight;
    tempCanvas.width = document.querySelector('.container').clientWidth;
    tempCanvas.height = document.querySelector('.container').clientHeight;
    svg.attr("width", buffer.width);
    svg.attr("height", buffer.height);
    width = buffer.width;
    height = buffer.height;

}
window.addEventListener('resize', resizeCanvas);



function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}


function getDataCoords(x, y) {
    return [
        Math.floor(clamp((x - canvasOffset.x) / canvasDim.width, 0, 1) * gridSize.x),
        gridSize.y - Math.floor(clamp((y - canvasOffset.y) / canvasDim.height, 0, 1) * gridSize.y),
    ];
}




function Particle(x, y) {
    this.reset(Math.floor(now + Math.random() * options.lifeTime));
}
Particle.prototype.reset = function (lifeTime) {
    this.x = canvasOffset.x + Math.floor(Math.random() * canvasDim.width);
    this.y = canvasOffset.y + Math.floor(Math.random() * canvasDim.height);
    this.refreshCoords();
    this.lifeTime = lifeTime || now + options.lifeTime;
};
Particle.prototype.refreshCoords = function () {
    var coords = getDataCoords(this.x, this.y);
    this.dataCoordX = coords[0];
    this.dataCoordY = coords[1];
};
Particle.prototype.tick = function () {
    if (this.x > canvasOffset.x + canvasDim.width || this.x < canvasOffset.x ||
        this.y > canvasOffset.y + canvasDim.height || this.y < canvasOffset.y ||
        this.lifeTime < now) {
        this.reset();
    }
};
Particle.prototype.nextPositionX = function () {
    this.x = this.x + data.wind10m_u[this.dataCoordY][this.dataCoordX] * timeDiff * options.speedFactor;
    return this.x;
};
Particle.prototype.nextPositionY = function () {
    this.y = this.y - data.wind10m_v[this.dataCoordY][this.dataCoordX] * timeDiff * options.speedFactor;
    return this.y;
};



var particles = [],
    bounds = [];
function setupCanvas() {

    // Temperature canvas
    tempCanvas = document.createElement('canvas');
    document.querySelector('.container').appendChild(tempCanvas);
    tempCtx = tempCanvas.getContext('2d');


    // Create canvas layers
    for (var i = 0; i < options.color.length; i++) {
        canvas[i] = document.createElement('canvas');
        document.querySelector('.container').appendChild(canvas[i]);
        ctx[i] = canvas[i].getContext('2d');
    }

    // Resize canvas
    resizeCanvas();


    // Set which paramter will be colored
    setupBounds();


    // Create particles
    for (var i = 0; i < 10000; i++) {
        particles[i] = new Particle();
    }

    // Start rendering
    render();


    // Mouse event
    var container = document.querySelector('.container'),
        header = document.querySelector('.header');

    container.addEventListener('mousemove', function(e) {
        var coords = getDataCoords(e.x, e.y - header.clientHeight);
        var proj = projection([data.lon[coords[1]][coords[0]], data.lat[coords[1]][coords[0]]]);
        cursor.attr('transform', 'translate(' + proj + ')');
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                if (document.querySelector('.data_' + key)) {
                    document.querySelector('.data_' + key).innerHTML = data[key][coords[1]][coords[0]];
                }
            }
        }
    });

}


function setupBounds(criterion) {

    if (criterion) {
        options.criterion = criterion;
    }

    // Find min/max
    var min = Math.min.apply(null, data[options.criterion].map(function(item) {
        return Math.min.apply(null, item);
    })) - 0.1;
    var max = Math.max.apply(null, data[options.criterion].map(function(item) {
        return Math.max.apply(null, item);
    }));

    // Find temp bounds
    var step = (max - min) / options.color.length;
    bounds = [];
    for (var i = 0; i < options.color.length; i++) {
        bounds.push({
           low: min + step * i,
           high: min + step * (i + 1)
        });
    }

}



var fpsCounter = function() {
    var fps = 0;
    return function (newFps) {
        fps = (fps * 4 + newFps) / 5;
        return Math.floor(fps * 10) / 10;
    };
}();


function render() {

    now = Date.now();
    timeDiff = (Date.now() - lastTick) / 16; // timeDiff should be near 1 at 60fps
    lastTick = now;

    requestAnimationFrame(render);

    bufferCtx.globalAlpha = options.globalAlpha;

    for (var j = 0; j < particles.length; j++) {
       particles[j].refreshCoords();
       particles[j].tick();
    }

    for (var i = 0; i < canvas.length; i++) {

       bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
       bufferCtx.drawImage(canvas[i], 0, 0);
       ctx[i].clearRect(0, 0, canvas[i].width, canvas[i].height);
       ctx[i].drawImage(buffer, 0, 0);

       ctx[i].beginPath();

           ctx[i].lineWidth = options.lineWidth;
           ctx[i].strokeStyle = 'rgba(' + options.color[i] + ',' + options.colorAlpha + ')';

           for (var j = 0; j < particles.length; j++) {
               var criterion = data[options.criterion][particles[j].dataCoordY][particles[j].dataCoordX];
               if (bounds[i].low < criterion && criterion <= bounds[i].high) {
                   ctx[i].moveTo(particles[j].x, particles[j].y);
                   ctx[i].lineTo(particles[j].nextPositionX(), particles[j].nextPositionY());
               }
           }

       ctx[i].stroke();

    }

    /**
     * FPS counter
     */
    ctx[0].clearRect(0, 0, 50, height);
    ctx[0].fillStyle = '#ffffff';
    ctx[0].fillText(fpsCounter(1000 / (timeDiff * 16)), 0, height);

}


NodeList.prototype.forEach = Array.prototype.forEach;
document.querySelectorAll('.menu a').forEach(function(el) {
    el.addEventListener('click', function(e) {
        e.preventDefault();
        setupBounds(el.dataset.criterion);
    });
});