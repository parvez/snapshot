$(function () {

    var API_SERVER = "/api";
    var DATE_FORMAT_1 = "MM/DD/YYYY";
    var DATE_FORMAT_2 = "MMM D, YYYY hh:mm:ss a";
    var DATE_FORMAT_3 = "YYYY-MM-DDThh:mm:ss";

    $.fn.dataTable.moment( DATE_FORMAT_2 );

    var add_dt_tooltips = function(container_id) {
      $(container_id + " td").each( function(a) {
        this.offsetWidth < this.scrollWidth && $(this).wrapInner("<span class='dt-tooltip' data-toggle='tooltip' data-original-title='" + this.innerHTML + "' title='" + this.innerHTML + "'></span>");
      });
      $(container_id + " [data-toggle='tooltip']").tooltip();
    }

    var chart1_load = function(position_path) {
      if (position_path) {
        $("#root_link").show()
      } else {
        $("#root_link").hide()
      }
      $('#root_link').off('click').on( 'click', function (e) {
        e.preventDefault()
        chart1_load()
      })

      var _table = $('#chart1').DataTable( {
        dom: "<'row title'<'col-md-6 title_l'><'col-md-6 title_r'f>>rtip",
        pageLength: 20,
        columnDefs : [
          { width: "55%", targets:  0 },
          { width: "15%", targets:  1 },
          { width: "30%", targets:  2 },
        ],
        order: [[ 2, "desc" ]],
        language: { search: "" },
        destroy: true,
        paging: true,
        searching: true,
        ajax: {
          url: API_SERVER + "/data",
          contentType: "application/json; charset=utf-8",
          data: {path: position_path}
        },
        columns: [
            { data: "Name",
              render: function ( data, type, row ) {
                var _d;
                switch(row.Type) {
                  case 'Folder' : _d = "folder-open-o"; break;
                  case 'png'    : _d = "file-image-o";  break;
                  case 'jpg'    : _d = "file-image-o";  break;
                  case 'pdf'    : _d = "file-pdf-o";    break;
                  default       : _d = "file-o";
                }
                return "<i class='fa fa-" + _d + "'></i>&nbsp;&nbsp;" + data;
              }
            },
            { data: "Type" },
            { data: "date_added",
              render: function ( data, type, row ) {
                if ( type === 'display' || type === 'filter' ) {
                      return moment(data).format(DATE_FORMAT_2);
                  }
                  return data;
              }
            }
        ],
        initComplete: function (settings, json) {
          // $("#chart1_wrapper .title_l").html('Directory Listing');
        }
      } );
      _table
        .off( 'init.dt' )
        .on( 'init.dt', function ( e, settings ) {
          add_dt_tooltips("#chart1");
        });
      $('#chart1 tbody').off('click').on( 'click', 'tr', function () {
        if ( $(this).hasClass('selected') ) {
          $(this).removeClass('selected');
        } else {
          _table.$('tr.selected').removeClass('selected');
          $(this).addClass('selected');
          var position = _table.row( this ).data();
          if (position) {
            if (position.Type == "Folder") {
              chart1_load(position.Path)
            } else {
              window.open("/data/" + position.Path)
            }
          }
        }
      } );
      $("#chart1_filter input").attr("placeholder", "Search...");
      $("#f_add_cron").off('submit').on("submit", function(e) {

        $("#f_add_cron input[name=cron]").val(cron_field.cron("value"))
        $("#f_add_cron input[name=cron_string]").val(cron_field.cron("string_value"))
        e.preventDefault()
        var _form = $(this)
        $.ajax(
          {
            type: "POST",
            url: "/api/add_cron",
            data: _form.serialize()
          }
        ).done(function(data) {
          if (data && data.status === 0) {
            $('#modal_add_cron').modal("hide")
            chart2_load()
          } else {
            alert("Unable to add!")
          }
        }).fail(function(data) {
            alert("Unable to add!")
        })

      });
    }
    var chart2_load = function() {
      var _table = $('#chart2').DataTable( {
        dom: "<'row title'<'col-md-6 title_l'><'col-md-6 title_r'f>>rtip",
        pageLength: 20,
        order: [[ 4, "desc" ]],
        columnDefs : [
          {
            orderable: false,
            width: "30px",
            targets:  5
          }          
        ],
        language: { search: "" },
        destroy: true,
        paging: true,
        searching: true,
        ajax: {
          url: API_SERVER + "/cron",
          contentType: "application/json; charset=utf-8"
        },
        columns: [
            { data: "name" },
            { data: "cron_string" },
            { data: "dashboard" },
            { data: "type" },
            { data: "date_added",
              render: function ( data, type, row ) {
                if ( type === 'display' || type === 'filter' ) {
                      return moment(data).format(DATE_FORMAT_2);
                  }
                  return data;
              }
            },
            { data: "id",
              render: function (data, type, row){
                 return '<button class="dt_action_delete btn btn-default btn-sm">Delete</button>';
              }
            }
          ],
        initComplete: function (settings, json) {
          // $("#chart2_wrapper .title_l").html('Cron Listing');
          $("#chart2_wrapper .dt_action_delete").off("click").on("click", function() {
            var _d = $('#chart2').DataTable().row($(this).closest('tr')).data()
            if (confirm("Are you sure you want to delete: " + _d.name)) {
              $.ajax(
                {
                  type: "DELETE",
                  url: "/api/cron/"+_d.id
                }
              ).done(function(data) {
                if (data && data.status === 0) {
                  chart2_load()
                } else {
                  alert("unable to delete!")
                }
              }).fail(function(data) {
                alert("unable to delete!")
              })
            }
          })
        }
      } );
      _table
        .off( 'init.dt' )
        .on( 'init.dt', function ( e, settings ) {
          add_dt_tooltips("#chart2");
        });
      $("#chart2_filter input").attr("placeholder", "Search...");
    }
    var chart3_load = function() {
      var _ck
      var _ga = function(_url, _id) {
        $.ajax({
          type: "GET", url: _url
        }).done(function(data) {
          if (data) {
            $('#logs > pre#'+_id+'> code').html(data.split("\n").sort().reverse().join("\n"))
          } else {
            $('#logs > pre#'+_id+' > code').html("< Empty >")
          }
        })
      }

      _ck = $("#ch_server_errors").prop("checked") ? "error" : "all"
      _ga( "/api/logs/server/"+_ck, "logs_server" )

      _ck = $("#ch_generate_errors").prop("checked") ? "error" : "all"
      _ga( "/api/logs/generate/"+_ck, "logs_generate")

      _ga( "/api/logs/crontab", "logs_crontab" )
    }

    var cron_field = $('#cron_select').cron({
      initial: "0 0 * * *",
      customValues: {},
      useGentleSelect: false
    })
    
    $.ajax(
      {
        type: "GET",
        url: "/api/dashboards"
      }
    ).done(function(data) {
      if (data && data.length) {
        for (_k in data) {
          $('#f_dashboard').append("<option value='"+data[_k]+"'>"+data[_k]+"</option>")
        }
      }
    }).fail(function(data) {
    })

    $('select', '#cron_select')
      .css({'display': 'inline-block','width':'initial'})
      .addClass('form-control')
    $('[data-toggle=tab]').on("click", function() {
      switch( $(this).attr("data-id") ) {
        case 'home':
          chart1_load()
          break
        case 'cron_list':
          chart2_load()
          break
        case 'logs':
          chart3_load()
          break
      }
    })

    $("#ch_server_errors").on("click", function() { chart3_load() })
    $("#ch_generate_errors").on("click", function() { chart3_load() })
    $('#logout').off('click').on( 'click', function (e) {
      e.preventDefault()
      $.ajax(
        {
          type: "GET",
          url: "/api/logout"
        }
      ).done(function(data) {
      }).fail(function(data) {
      })
    })

    $(window).keydown(function(event) {
      if(event.ctrlKey && event.keyCode == 71) { 
        $("a[data-id=home]").trigger("click")
        event.preventDefault(); 
      }
      if(event.ctrlKey && event.keyCode == 77) { 
        $("a[data-id=cron_list]").trigger("click")
        event.preventDefault(); 
      }
      if(event.ctrlKey && event.keyCode == 76) { 
        $("a[data-id=logs]").trigger("click")
        event.preventDefault(); 
      }
    });

    chart1_load();
    chart2_load();

});

