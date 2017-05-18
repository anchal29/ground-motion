//Ground Motion Plot
$(document).ready(function() {

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
                content: "Bedrock acceleration at %x.4 sec is  = %y.4g",
                shifts: {
                    x: -60,
                    y: 25
                }
            }
        };
        var data = [];

        $.plot($("#flot-line-chart"), data, options);

        // Fetch one series, adding to what we already have

        var alreadyFetched = {};

        $('#ground_motion_select').change(function () {
            var table = $('#dataTables-table').DataTable();
            table.destroy();

            // Find the URL in the link right next to us, then fetch the data
            var file_name = document.getElementById("ground_motion_select").value;
            var dataurl = "../Ground Motion/" + file_name + ".json";
            // console.log("../Ground Motion/" + file_name + ".json");

            function onDataReceived(series) {
                // Push the new data onto our existing data array
                if (!alreadyFetched[series.label]) {
                    alreadyFetched[series.label] = true;
                    data.push(series);
                }

                if (!($("#enableComparison:checked").length > 0)) {
                    data = []
                    data.push(series);
                }
                $.plot($("#flot-line-chart"), data, options);

                if (!($("#showTable:checked").length > 0)) {
                    $("#table-contents").empty();
                    return;
                }
                new_dat = series.data;
                var content = "<tbody id='table-contents'>";
                for(var i = 0; i < new_dat.length; i++) {
                    // console.log(new_dat[i][1]);
                    content += '<tr><td>' + i + '</td><td>' + series.label + '</td><td>' + new_dat[i][0] + '</td><td>' + new_dat[i][1] + '</td></tr>';
                }
                content += "</tbody>";
                // $('#table-contents').append('<tr><td> Hey </td><td> Ok </td><td> Yosh </td></tr>');
                $('#table-contents').replaceWith(content);
                $('#dataTables-table').DataTable({
                    responsive: true
                });
                
            }
            // console.log(dataurl);
            $.ajax({
                url: dataurl,
                type: "GET",
                dataType: "json",
                success: onDataReceived
            });
        });

        $('#clear-all-button').click(function () {
            data = [];
            alreadyFetched = [];
            $.plot($("#flot-line-chart"), data, options);

        });

        // Load the first series by default, so we don't have an empty plot
        $('#ground_motion_select').change();
    });

});
