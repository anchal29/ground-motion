<div class="row">
    <div class="col-lg-12">
        <div class="form-group">
            <label><h3>Select the ground motion</h3></label>
            <select class="form-control" id="ground_motion_select">
                <?php
                    $direc = "../Ground Motion/";
                    foreach (glob($direc.'*.json') as $file) {
                        $search_str = [$direc, ".json"];
                        $file_name = str_replace($search_str, "", $file);
                        echo "<option>".$file_name."</option>";

                    }
                ?>
            </select>
        </div>
    </div>
</div>