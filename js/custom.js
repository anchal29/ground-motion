//Ground motion amplification realted
$(document).ready(function() {

    $(function() {
        // Initialise the canvas
        var canvas = document.getElementById("soil-profile");
        var ctx = canvas.getContext("2d");

        // Resize the canvas whenever a layer is added or screen is resized.
        function resize_canvas() {
            var relative = document.getElementById("soil-layer-form");
            canvas.width = $(relative).width();
            canvas.height = $(relative).height();
        }

        $( window ).resize(function() {
            resize_canvas();
        });


        var content =  '<div class="row">\
                            <div class="col-lg-6">\
                                <div class="form-group">\
                                    <label>Depth of the layer</label>\
                                    <input class="form-control depth" placeholder="Enter the depth in meters" type="number" step="any">\
                                </div>\
                            </div>\
                            <div class="col-lg-6">\
                                <div class="form-group">\
                                    <label>Soil Type</label>\
                                    <select class="form-control soil-type">\
                                        <option>A</option>\
                                        <option>B</option>\
                                        <option>C</option>\
                                        <option>D</option>\
                                        <option>E</option>\
                                        <option>F</option>\
                                    </select>\
                                </div>\
                            </div>\
                        </div>';

        $("#add-soil-layers").click(function() {
            $('#soil-layers').append(content);
            resize_canvas();

            // Draw soil layers
            var layers_soil_type = $(".soil-type");
            var layers_depth = $(".depth");
            draw(layers_soil_type, layers_depth);
        });

        $("#clear-button").click(function() {
            $('#soil-layers').replaceWith(content);
            resize_canvas();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });

        function draw(layers_soil_type, layers_depth)  {
            var height = canvas.height;
            var width = canvas.width;
            no_layers = layers_depth.length - 1;
            var soil_profile_images = [];
            var total_depth = 0;
            var depths = [];
            for (var i = no_layers; i >= 1; i--) {
                total_depth += Number($(layers_depth[i-1]).val());
                depths.push(Number($(layers_depth[i-1]).val()));
            }
            for (var i = no_layers-1; i >= 0; i--) {
                var temp = loadImage('../images/'+ $(layers_soil_type[i]).val() +'.jpg', drawImages);
                soil_profile_images.push(temp);
                function loadImage(src, onload) {
                    var img = new Image();

                    img.src = src;
                    img.onload = onload;

                    return img;
                }
                var images_loaded =  0;
                function drawImages(){
                    images_loaded++;
                    // Draw all the images at once after all the images are loaded.
                    if(images_loaded == no_layers) {
                        var dy;
                        var y =  100 + 48;
                        for(var k = 0; k<soil_profile_images.length; k++) {
                            dy = (height-208)*depths[k]/total_depth;
                            var ptrn = ctx.createPattern(soil_profile_images[k], 'repeat');
                            ctx.fillStyle = ptrn;
                            ctx.fillRect(width*0.1, y, width*0.8, dy);
                            y += dy;
                        }               
                    }
                }
            }
            // To get grass image on the top of soil layers
            var gras_img = new Image();
            gras_img.src = '../images/grass.png';
            gras_img.onload = function() {
              var pattern = ctx.createPattern(gras_img, 'repeat');
              ctx.fillStyle = pattern;
              ctx.fillRect(width*.1, 60, width*0.8, 100);
            };                 
        };
        resize_canvas();
    });

});

// Initial response spectrum calculation
$(function() {

    var options = {
        series: {
            lines: {
                show: true
            },
        },
        grid: {
            hoverable: true //IMPORTANT! this is needed for tooltip to work
        },
        colors:["#0fbbff", "#25ad00", "#86ce02", "#d60cd6", "#e83d00", "#00e868"],
        tooltip: true,
        tooltipOpts: {
            content: "Spectral acceleration for %x.4 time period is  = %y.4g",
            shifts: {
                x: -60,
                y: 25
            }
        }
    };
    function response_spectrum(ground_motion_data) {
        // Isitialising variables.
        var index     = 0,
            zeta      = 0,
            fdata     = [],
            force     = [],
            deltaA    = [],
            deltaP    = [],
            deltaU    = [],
            deltaV    = [],
            vel_max   = [],
            disp_max  = [],
            accel_max = [],
            deltaPcap = [],
            gamma     = 0.5,
            g         = 9.81,
            mass      = 2000,
            beta      = 0.25,
            timeStep  = 0.02;

        var natural_freq, stiff, c;
        // Calculate force as mass time gravity times given acceleration.
        for(var i = 0; i<ground_motion_data.length; i++)
            force[i] = ground_motion_data[i]*mass*g;
        for(timePeriod=0.01; timePeriod<2; timePeriod+=0.01){
            var disp  = [],
                vel   = [],
                accel = [];
            // Meta data calculation to implement Central Deflection Method or Newmarks Method 

            natural_freq = 2 * Math.PI / timePeriod;
            stiff = (mass*natural_freq*natural_freq);
            c = 2*mass*stiff*zeta;

            // Code for Central Deflection Method
            kcap = stiff + ((gamma/(beta*timeStep))*c) + (mass/(beta*timeStep*timeStep));
            a = mass/(beta*timeStep)  + (gamma*c / beta);
            b = mass/(beta*2)+timeStep*((gamma/(2*beta))-1);
            disp[0] = 0;
            vel[0] = 0;
            accel[0] = force[0]/mass;
            disp_max[index] = 0;
            vel_max[index] = 0;
            accel_max[index] = 0;
            for(var i = 0; i < force.length; i++){
                deltaP[i] = force[i+1] - force[i];
                deltaPcap[i] = deltaP[i] + (a*vel[i]) + (b*accel[i]);
                deltaU[i] = deltaPcap[i]  / kcap;
                deltaV[i] = (gamma*deltaU[i]/(beta*timeStep))-(gamma*vel[i]/beta)+(timeStep*accel[i]*(1-(gamma/(2*beta))));
                deltaA[i] = (deltaU[i]/(beta*(timeStep*timeStep)))-(vel[i]/(beta*timeStep))-(accel[i]/(2*beta));
                disp[i+1] = disp[i] + deltaU[i];
                vel[i+1] = vel[i] + deltaV[i];
                accel[i+1] = accel[i] + deltaA[i];
                // Store the maximum displacement, velocity and acceleration.
                if(disp_max[index] < Math.abs(disp[i+1]))
                    disp_max[index] = Math.abs(disp[i+1]);

                if(vel_max[index] < Math.abs(vel[i+1]))
                    vel_max[index] = Math.abs(vel[i+1]);

                if(accel_max[index] < Math.abs(accel[i+1]))
                    accel_max[index] = Math.abs(accel[i+1]);
            }
            fdata.push([timePeriod, accel_max[index]]);
            index += 1;
        }
        console.log(disp_max);
        return {data: fdata, label: 'Response Sprectrum'};

    }

    $('#ground_motion_select').change(function () {
        var reponse_data = [];
        $.plot($("#response-spectrum-plot"), reponse_data, options);
        var file_name = document.getElementById("ground_motion_select").value;
        var dataurl = "../Ground Motion/" + file_name + ".json";

        function onDataReceived(series) {
            var data = [];
            for(var i = 0; i < series.data.length; i++) {
                data.push(series.data[i][1]);
            }
            response_data = response_spectrum(data);
            var new_data = [];
            new_data.push(response_data);
            console.log(response_data);
            $.plot($("#response-spectrum-plot"), new_data, options);
            // console.log('Here');
        }
        $.ajax({
            url: dataurl,
            type: "GET",
            dataType: "json",
            success: onDataReceived
        });
    // Load the first series by default, so we don't have an empty plot
    });
    $('#ground_motion_select').change();
});

// Amplified response spectrum calculation
$(function() {
});