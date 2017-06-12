$(function() {
    // Initialise the canvas
    var canvas = document.getElementById("soil-profile");
    var ctx = canvas.getContext("2d");
    // Global variable to store the ground motion data.
    var raw_gm_data;
    var response_data;

    /**
     * Resize the canvas in accordance with the div attached to the soil layer
     * form. This way the shown soil layers in canvas looks decent. It is called
     * when a layer is added or screen is resized.
     */
    function resize_canvas() {
        var relative = document.getElementById("soil-layer-form");
        canvas.width = $(relative).width();
        canvas.height = $(relative).height();
    }

    $( window ).resize(function() {
        resize_canvas();
    });

    // content is the html code to add a layer in the soil layer form.
    var content =  '<div class="row">\
                        <div class="col-lg-6">\
                            <div class="form-group">\
                                <label>Depth of the layer</label>\
                                <input class="form-control depth" placeholder="Enter the depth in meters" type="number" step="any" value=0>\
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

    /*
     * Called when add layers button is clicked. It appends form input for one 
     * more layer into the soil layer form. Also call draw to re-draw the canvas
     * drawing.
     */
    $("#add-soil-layers").click(function() {
        $('#soil-layers').append(content);
        resize_canvas();

        // Draw soil layers
        var layers_soil_type = $(".soil-type");
        var layers_depth = $(".depth");
        draw(layers_soil_type, layers_depth, 1);
        amplified_response_spectrum(layers_soil_type, layers_depth, 1);
    });

    /*
     * Submit button callback.
     */
    $("#submit-button").click(function() {
        // Draw soil layers
        var layers_soil_type = $(".soil-type");
        var layers_depth = $(".depth");
        draw(layers_soil_type, layers_depth, 0);
        amplified_response_spectrum(layers_soil_type, layers_depth, 0);
    });

    /*
     * Clear the canvas if clear button is clicked.
     */
    $("#clear-button").click(function() {
        $('#soil-layers').empty();
        $('#soil-layers').append(content);
        resize_canvas();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        $.plot($("#amp-response-spectrum-plot"), [], []);
    });

    /*
     * Draw the added layer on the canvas. It is called when user clicks the add 
     * more layers. It draws all the layers present in the soil layer form at 
     * current reflecting the depth and soil type on the plot. The height of 
     * added layers are normalised according to the specified depth and soil
     * texture shows the type of soil layer.
     */
    function draw(layers_soil_type, layers_depth, add_layer)  {
        var height = canvas.height;
        var width = canvas.width;
        if(add_layer)
            no_layers = layers_depth.length - 1;
        else
            no_layers = layers_depth.length;
        var soil_profile_images = [];
        var total_depth = 0;
        var depths = [];
        for (var i = no_layers; i >= 1; i--) {
            total_depth += Number($(layers_depth[i-1]).val());
            depths.push(Number($(layers_depth[i-1]).val()));
        }
        for (var i = no_layers-1; i >= 0; i--) {
            // Different soil types has different images representing the 
            // texture uniquely for each of them.
            var temp = loadImage('../images/Soil Images/'+ $(layers_soil_type[i]).val() +'.jpg', drawImages);
            soil_profile_images.push(temp);

            /*
             * Loads the image and when the image is loaded it calls drawImages
             *
             * @return Image object for the 
             */
            function loadImage(src, onload) {
                var img = new Image();

                img.src = src;
                img.onload = onload;

                return img;
            }
            var images_loaded =  0;

            /*
             * When all the images are loaded plot them together.
             */
            function drawImages(){
                images_loaded++;
                // Draw all the images at once after all the images are loaded.
                if(images_loaded == no_layers) {
                    var dy;
                    var y =  100 + 48;
                    for(var k = 0; k<soil_profile_images.length; k++) {
                        dy = (height-208)*depths[k]/total_depth;

                        // Use pattern to replicate the images and get the soil profile.
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
    // Initial call.
    resize_canvas();

    // Initial response spectrum calculation without considering site effects.
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
        },
        yaxis: {
            tickFormatter: function(value, axis) {
                    return value < axis.max ? value.toFixed(2) : "S(a)/g";
                }
        },
        xaxis: {
            tickFormatter: function(value, axis) {
                    return value < axis.max ? value.toFixed(2) : "T";
                }
        }

    };

    /**
     * Calculated response spectrum for choosen ground motion using central 
     * difference method.
     *
     * @return Object with label and response spectrum data.
     */    
    function response_spectrum(ground_motion_data, timeStep, fixed_time_periods) {
        // Isitialising variables.
        var index     = 0,
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
            zeta      = 0.05,
            g         = 9.81,
            mass      = 2000,
            beta      = 0.25;

        var natural_freq, stiff, c;
        // Calculate force as mass time gravity times given acceleration.
        for(var i = 0; i<ground_motion_data.length; i++)
            force[i] = ground_motion_data[i]*mass*g;
        if(!fixed_time_periods) {
            time_period = [];
            for(timePeriod=0.01; timePeriod<2; timePeriod+=0.01)
                time_period.push(timePeriod);
        }
        else {
            time_period = [0, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.06, 0.075, 0.09, 0.1, 0.15, 0.2, 0.3,  0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.2, 1.5, 2, 2.5, 3, 5];
        }

        for(k = 0; k<time_period.length; k++){
            timePeriod = time_period[k];
        // for(timePeriod=0.01; timePeriod<2; timePeriod+=0.01){
            var disp  = [],
                vel   = [],
                accel = [];
            // Meta data calculation to implement Central Deflection Method or Newmarks Method 

            natural_freq = 2 * Math.PI / timePeriod;
            stiff = (mass*natural_freq*natural_freq);
            c = 2*mass*natural_freq*zeta;

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
            fdata.push([timePeriod, accel_max[index]/g]);
            index += 1;
        }
        return {data: fdata, label: 'Response Sprectrum at bedrock level'};

    }

    /*
     * If the ground motion is changed reload the data from server. Calculate 
     * and plot the response spectrum.
     */
    $('#ground_motion_select').change(function () {
        response_data = []
        $.plot($("#response-spectrum-plot"), response_data, options);
        var file_name = document.getElementById("ground_motion_select").value;
        var dataurl = "../Ground Motion/" + file_name + ".json";
        data = [];

        /*
         * Plot the response spectrum for the selected ground motion.
         */
        function onDataReceived(series) {
            raw_gm_data = series;
            for(var i = 0; i < series.data.length; i++) {
                data.push(series.data[i][1]);
            }
            response_data = response_spectrum(data, series.timeStep, 1);
            temp_data = response_spectrum(data, series.timeStep, 0);
            var new_data = [];
            new_data.push(temp_data);
            $.plot($("#response-spectrum-plot"), new_data, options);
        }
        $.ajax({
            url: dataurl,
            type: "GET",
            dataType: "json",
            success: onDataReceived
        });
    });
    // Load the first series by default, so we don't have an empty plot
    $('#ground_motion_select').change();
    
    /*
     * Calculated the amplified response spectrum considering site conditions.
     * Here taking the provided soil profile for the purpose.
     */    
    function amplified_response_spectrum(layers_soil_type, layers_depth, add_layer) {
        var vel           = 0,
            time          = 0,
            no_layers     = 0,
            total_depth   = 0,
            layer_depth   = 0,
            avg_shear_vel = 0,
            amp_motion    = [],
            amp_response  = [],
            amp_factor_s  = [],
            cal_soil_type = [],
            soil_type     = 'A';
        
        // Avg shear velocities mean. Index 0 => Soil type A, 1 => B, so on.
        var nherp_avg_shear_vel = [1500, 1130, 560, 270, 180, 180];
        var temp = [1500, 760, 360, 180]
        // Calculating the NHERP shear wave velocity.
        if(add_layer)
            no_layers = layers_depth.length - 1;
        else
            no_layers = layers_depth.length;
        for (var i = no_layers-1; i >= 0; i--) {
            if(total_depth >= 30)
                break;
            layer_depth = Number($(layers_depth[i]).val());
            if(layer_depth + total_depth > 30)
                layer_depth = 30 - total_depth;
            total_depth += layer_depth;
            soil_type = $(layers_soil_type[i]).val();
            vel = nherp_avg_shear_vel[soil_type.charCodeAt(0) - 'A'.charCodeAt(0)];
            time += (layer_depth/vel);
        }
        if(total_depth < 30) {
            layer_depth = 30 - total_depth;
            total_depth = 30;
            time += (layer_depth/1500);
        }
        avg_shear_vel = total_depth/time;
        for(var i = 0; i<=3; i++){
            if(avg_shear_vel >= temp[i]){
                cal_soil_type = [i + 'A'.charCodeAt(0), String.fromCharCode(i + 'A'.charCodeAt(0)), i];
                break;
            }
        }
        for(var i = 0; i < response_data.data.length; i++) {
            // Bed rock acceleration
            br_acc = response_data.data[i][1];
            amp_factor = Math.exp(a1[cal_soil_type[2]][i]*br_acc + a2[cal_soil_type[2]][i] + ln_delta[cal_soil_type[2]][i]);
            amp_factor_s.push(amp_factor);
            amp_motion.push(amp_factor * br_acc);
            amp_response.push([response_data.data[i][0], amp_factor * br_acc]);
        }
        amp_response = [{data: amp_response, label: 'Response Sprectrum at surface'}];
        amp_response.push(response_data);
        $.plot($("#amp-response-spectrum-plot"), amp_response, options);
        return amp_response;
    }
    time_period = [0, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.06, 0.075, 0.09, 0.1, 0.15, 0.2, 0.3,  0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.2, 1.5, 2, 2.5, 3, 5];
    a2 = [[0.36, 0.35, 0.31, 0.26, 0.25, 0.31, 0.36, 0.39, 0.43, 0.46, 0.47, 0.50, 0.51, 0.53, 0.52   , 0.51, 0.49, 0.49, 0.48, 0.47, 0.46, 0.45, 0.43, 0.39, 0.36, 0.34, 0.32, 0.31],
          [0.49, 0.43, 0.36, 0.24, 0.18, 0.29, 0.40, 0.48, 0.56, 0.62, 0.71, 0.74, 0.76, 0.76, 0.74, 0.72, 0.69, 0.68, 0.66, 0.63, 0.61, 0.62, 0.57, 0.51, 0.44, 0.40, 0.38, 0.36],
          [0.66, 0.66, 0.54, 0.32, -0.01, -0.05, 0.11, 0.27, 0.50, 0.68, 0.79, 1.11, 1.16, 1.03, 0.99, 0.97, 0.93, 0.88, 0.86, 0.84, 0.81, 0.78, 0.67, 0.62, 0.47, 0.39, 0.32, 0.35],
          [0.80, 0.80, 0.69, 0.55, 0.42, 0.58, 0.65, 0.83, 0.93, 1.04, 1.12, 1.40, 1.57, 1.56, 1.43, 1.34, 1.32, 1.29, 1.28, 1.27, 1.25, 1.23, 1.14, 1.01, 0.79, 0.68, 0.60, 0.44]];
    a1 = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [-0.89, -0.89, -0.89, -0.91, -0.94, -0.87, -0.83, -0.83, -0.81, -0.83, -0.84, -0.93, -0.78, 0.06, -0.06, -0.17, -0.04, -0.25, 0.36, -0.34, -0.29, 0.24, -0.11, -0.10, -0.13, -0.15, -0.17, -0.19],
          [-2.61, -2.62, -2.62, -2.61, -2.54, -2.44, -2.34, -2.78, -2.32, -2.27, -2.25, -2.38, -2.32, -1.81, -1.28, -0.69, -0.56, -0.42, -0.36, -0.18, 0.17, 0.53, 0.77, 1.13, 0.61, 0.37, 0.13, 0.12]];
    ln_delta = [[0.03, 0.04, 0.06, 0.08, 0.04, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.06, 0.01, 0.01, 0.02, 0.01, 0.01, 0.02, 0.01, 0.02, 0.03, 0.04, 0.04, 0.05],
                [0.08, 0.11, 0.16, 0.09, 0.03, 0.01, 0.02, 0.02, 0.03, 0.02, 0.01, 0.01, 0.02, 0.02, 0.01, 0.02, 0.02, 0.02, 0.02, 0.01, 0.02, 0.11, 0.03, 0.04, 0.06, 0.08, 0.1, 0.11],
                [0.23, 0.23, 0.23, 0.19, 0.25, 0.21, 0.18, 0.18, 0.19, 0.18, 0.15, 0.16, 0.18, 0.13, 0.12, 0.12, 0.12, 0.09, 0.12, 0.12, 0.10, 0.09, 0.09, 0.08, 0.08, 0.09, 0.08],
                [0.36, 0.37, 0.37, 0.34, 0.31, 0.31, 0.29, 0.29, 0.19, 0.29, 0.19, 0.28, 0.19, 0.16, 0.16, 0.21, 0.21, 0.21, 0.19, 0.21, 0.21, 0.15, 0.17, 0.17, 0.15, 0.15, 0.13, 0.15]];

    function saveData(response_data) {
        console.log(response_data);
        var filename = "Response Spectrum Data.txt";

        var blob = new Blob([response_data], {
         type: "text/plain;charset=utf-8"
        });
        saveAs(blob, filename);
    }

    /*
     * Download button callback.
     */
    $("#download-button").click(function() {
        // Draw soil layers
        var layers_soil_type = $(".soil-type");
        var layers_depth = $(".depth");
        var amp_res = amplified_response_spectrum(layers_soil_type, layers_depth, 0);
        console.log(amp_res);
        saveData(amp_res);
    });

});