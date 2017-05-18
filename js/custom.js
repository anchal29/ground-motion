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

        $("#add-soil-layers").click(function() {
            var content =  '<div class="row">\
                                <div class="col-lg-6">\
                                    <div class="form-group">\
                                        <label>Depth of the layer</label>\
                                        <input class="form-control depth" placeholder="Enter the depth in meters">\
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
            $('#soil-layers').append(content);
            resize_canvas();

            // Draw soil layers
            var layers_soil_type = $(".soil-type");
            var layers_depth = $(".depth");
            draw(layers_soil_type, layers_depth);
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
            // console.log(total_depth);
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
                        var y =  100 + 40;
                        for(var k = 0; k<soil_profile_images.length; k++) {
                            dy = (height-200)*depths[k]/total_depth;
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
