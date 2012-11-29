(function($) {
    // The number of digits in a Timelord field ID.
    // 10 should be enough for most uses; if you run into problems with this,
    // change this variable.
    var numIDDigits = 10;
    
    // Default options
    // Use the 'option' command to override
    var options = {
        dayNames: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
        ],
        dayNamesShort: [
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
            'Sun'
        ],
        monthNames: [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
        ],
        monthNamesShort: [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec'
        ],
        formatTime: '{ hour }:{ minute }',
        formatDay: '{ weekday }',
        formatDate: '{ weekday } { shortmonthname } { day }, { year }',
        formatDateTime: '{ weekday } { shortmonthname } { day }, { year } { hour }:{ minute }'
    };
    
    var attachedTimelordFields = [
        // A record of all Timelord fields that have been attached, and need to have click handling.
    ];
    
    /***
     * Formatting functions
     ***/
    var format_functions = {
        // These are functions that can be applied to format strings (e.g. { string.function }).
        // They get the string as an argument, and must return the modified string.
        lowercase: function(string) {
            return string.toLowerCase();
        },
        uppercase: function(string) {
            return string.toUpperCase();
        }
    };
    
    function format_apply(string, funcname) {
        if (format_functions[funcname]) {
            return format_functions[funcname](string);
        } else {
            return string;
        }
    }
    
    var strip_re = new RegExp('\\w+\\.\\w+');
    function format(string, values) {
        // Takes a table of values to replace in the string.
        // Tokens in the string must be surrounded with {}'s,
        // that may have leading and/or trailing spaces inside them.
        var r = string;
        for (key in values) {
            // Match any function applications
            var fre = new RegExp('{\\s*' + key + '\\.\\w+\\s*}', 'g');
            var matches = r.match(fre);
            for (var matchnum in matches) {
                var value = values[key];
                var match = matches[matchnum].match(strip_re);
                match = match[0];
                var _temp = match.split('.');
                value = format_apply(value, _temp[1]);
                var re = new RegExp('{\\s*' + key + '\\.' + _temp[1] + '\\s*}', 'g');
                r = r.replace(re, value);
            }
            
            var gre = new RegExp('{\\s*' + key + '\\s*}', 'g');
            r = r.replace(gre, values[key]);
        }
        return r;
    }
    
    /***
     * Reacting to changes and clicks
     ***/
    
    function onChange_twoDigits(event) {
        // Makes a minute or hour field always display two digits.
        // Will not affect fields with more than two digits.
        var value = $(event.target).val()
        if (value.length == 1) {
            $(event.target).val("0" + value)
        }
    };
    
    function onChange_timelordInput(event) {
        // Called from any input field in a Timelord field
        // Finds the corresponding Timelord field, gets its
        // string value, and changes the corresponding
        // input field to match.
        var picker = timelordFields[Number($(event.target).attr('timelord-id'))];
        var value = getValue(picker);
        picker.input.val(value);
    };
    
    function onChange_spinner(event) {
        // jQueryUI spinners don't work with simple change events.
        // This is used instead.
        onChange_twoDigits(event);
        onChange_timelordInput(event);
    }
    
    function onClick_day(event) {
        // Called when a day selector is clicked.
        // Updates the picker's date field, and inserts the
        // long name of the day into the input field.
        event.preventDefault();
        
        var day = $(event.currentTarget).attr('day');
        var picker = timelordFields[Number($(event.currentTarget).attr('timelord-id'))];
        picker.day = day;
        var value = getValue(picker);
        picker.input.val(value);
        
        // Change the colour of the day button to indicate it has been selected
        picker.find('li.timelord-daypicker-day').removeClass('selected');
        $(event.currentTarget).addClass('selected');
    }
    
    function onClick_prevMonth(event) {
        event.preventDefault();
        
        var picker = timelordFields[Number($(event.currentTarget).attr('timelord-id'))];
        
        setDisplayMonth(picker, picker.displayYear, picker.displayMonth - 1);
    }
    
    function onClick_nextMonth(event) {
        event.preventDefault();
        
        var picker = timelordFields[Number($(event.currentTarget).attr('timelord-id'))];
        
        setDisplayMonth(picker, picker.displayYear, picker.displayMonth + 1);
    }
    
    function onClick_date(event) {
        // Called when a calendar date is clicked.
        event.preventDefault();
        
        var day = $(event.currentTarget).attr('daynum');
        var picker = timelordFields[Number($(event.currentTarget).attr('timelord-id'))];
        
        setSelectedDay(picker, picker.displayYear, picker.displayMonth, day);
    }
    
    function onClick_attachedTimelordField(event) {
        event.stopPropagation();
    }
    
    function onFocus_attachedInput(event) {
        timelordFields[Number($(event.currentTarget).attr('timelord-id'))].show();
    }
    
    $(window).click(function(event) {
        for (var i in attachedTimelordFields) {
            attachedTimelordFields[i].hide();
        }
    });
    
    /***
     * ID generation
     ***/
    var timelordFields = [
        // A record of existing Timelord fields.
    ];
    var timelordIDsInUse = [];
    
    function generateUniqueTimelordID() {
        // Generates a unique Timelord ID.
        // An ID will only be generated once,
        // regardless of whether it's used or not.
        var min = Math.pow(10, numIDDigits - 1);
        var max = Math.pow(10, numIDDigits) - 1;
        
        var rand = Math.floor(Math.random() * (max - min) + min);
        while (timelordIDsInUse[rand]) {
            rand = Math.floor(Math.random() * (max - min) + min);
        };
        
        timelordIDsInUse[rand] = true;
        return rand;
    };
    
    /***
     * Main methods
     ***/
    var methods = {
        'attach': function(inputTag, picker) {
            // Attaches a Timelord field to the specified input tag.
            // The Timelord field will appear only when the target input field,
            // or the Timelord field itself, has focus.
            // This will surround the input tag in a div that contains it
            // and the picker.
            
            var newContainer = $('<div class="timelord-attach-container"></div>');
            inputTag.before(newContainer);
            inputTag.appendTo(newContainer);
            
            picker.addClass('timelord-attached');
            picker.click(onClick_attachedTimelordField);
            attachedTimelordFields[picker.id] = picker;
            inputTag.after(picker);
            inputTag.attr('timelord-id', picker.id);
            inputTag.click(onClick_attachedTimelordField);
            
            inputTag.focus(onFocus_attachedInput);
        },
        'append': function(inputTag, picker) {
            // Appends a Timelord field to the specified input tag.
            // The Timelord field will appear as part of the page, and will
            // remain visible.
            
            inputTag.after(picker);
        },
        'replace': function(inputTag, picker) {
            // Replaces an input tag with a Timelord field.
            // This is a visual change; the input tag will simply be hidden,
            // and all information in the Timelord field will be sent to the
            // input tag.
            
            inputTag.after(picker);
            inputTag.hide();
        }
    };
    
    /***
     * Value retrievers
     * These functions return a formatted string representing the values entered
     * into their fields.
     ***/
    
    function getValue(picker) {
        // General function for getting the formatted value of a picker.
        // Use this rather than choosing from one of the below.
        switch (picker.type) {
            case 'time':
                return getTimePickerValue(picker);
                break;
            case 'day':
                return getDayPickerValue(picker);
                break;
            case 'date':
                return getDatePickerValue(picker);
                break;
            case 'datetime':
                return getDateTimePickerValue(picker);
                break;
        };
        return "";
    };
    
    function getTimePickerValue(picker) {
        var hour = picker.hour.val();
        var minute = picker.minute.val();
        
        return format(options.formatTime, { hour: hour, minute: minute });
    };
    
    function getDayPickerValue(picker) {
        var day = picker.day;
        
        return format(options.formatDay, { weekday: options.dayNames[day] });
    };
    
    function getDatePickerValue(picker) {
        var year = picker.year;
        var month = picker.month;
        var day = picker.day;
        
        var dto = new Date(year, month - 1, day);
        var weekday = (dto.getDay() + 6) % 7;
        
        return format(options.formatDate, {
            year: year,
            shortyear: (year % 100),
            month: month,
            monthname: options.monthNames[month-1],
            shortmonthname: options.monthNamesShort[month-1],
            weekday: options.dayNames[weekday],
            shortweekday: options.dayNamesShort[weekday],
            day: day
        });
    };
    
    function getDateTimePickerValue(picker) {
        var hour = picker.hour.val();
        var minute = picker.minute.val();
        
        var year = picker.year;
        var month = picker.month;
        var day = picker.day;
        
        var dto = new Date(year, month - 1, day);
        var weekday = (dto.getDay() + 6) % 7;
        
        var dayname = options.dayNames[weekday];
        var monthname = options.monthNamesShort[month - 1];
        
        return format(options.formatDateTime, {
            year: year,
            shortyear: (year % 100),
            month: month,
            monthname: options.monthNames[month-1],
            shortmonthname: options.monthNamesShort[month-1],
            weekday: options.dayNames[weekday],
            shortweekday: options.dayNamesShort[weekday],
            day: day,
            hour: hour,
            minute: minute
        });
    };
    
    /***
     * Month setters (for date/datetime pickers)
     ***/
    
    function setDisplayMonth(picker, year, month, day) {
        // Year, month and day are 1-based.
        // Day is optional; if provided, that day in the month will be shown as selected.
        // This is just to prevent copying code.
        if (picker.type != 'date' && picker.type != 'datetime') {
            return;
        };
        
        if (!day) { day = ((month == picker.month && year == picker.year) ? picker.day : 0); };
        
        var dto = new Date(year, month - 1, 1);
        var lastDayDto = new Date(year, month, 0);
        
        year = dto.getFullYear();
        month = dto.getMonth() + 1;
        picker.displayYear = year;
        picker.displayMonth = month;
        
        // Change the month and year display
        picker.find('span.timelord-month').text(options.monthNames[month-1]);
        picker.find('span.timelord-year').text(year);
        
        // Find the weekday of the first day in the month (with 0 indicating Monday),
        // and the number of days in the month
        var firstDay = (dto.getDay() + 6) % 7;
        var numDays = lastDayDto.getDate();
        
        // Go through the calendar table, filling in values as necessary and
        // hiding the fields that do not contain valid dates for that month
        for (var rownum = 0; rownum < 6; ++rownum) {
            for (var colnum = 0; colnum < 7; ++colnum) {
                var cellnum = (7 * rownum) + colnum;
                var daynum = cellnum - firstDay + 1;
                if (daynum > 0 && daynum <= numDays) {
                    picker.cells[rownum][colnum].removeClass('outofrange').removeClass('selected');
                    picker.cells[rownum][colnum].link.text(daynum);
                    picker.cells[rownum][colnum].link.attr('daynum', daynum);
                    if (daynum == day) {
                        picker.cells[rownum][colnum].addClass('selected');
                    }
                } else {
                    picker.cells[rownum][colnum].addClass('outofrange');
                }
            }
        }
    }
    
    function setSelectedDay(picker, year, month, day) { // Year, month and day are all 1-based here
        if (picker.type != 'date' && picker.type != 'datetime') {
            return;
        };
        
        // Set the displayed day to the selected one
        setDisplayMonth(picker, year, month, day);
        
        // Store the data in the picker
        picker.year = year;
        picker.month = month;
        picker.day = day;
        
        // Insert the date into the correct field
        picker.input.val(getValue(picker));
    }
    
    /***
    * Picker creators
    * Creates and returns a picker. The picker will not be inserted anywhere
    * in the HTML as a direct result of calling one of these.
    ***/
    function createTimePicker(inputField) {
        // Select a 10-digit Timelord ID that is not in use
        var id = generateUniqueTimelordID();
        
        // Create the Timelord container
        var container = $('<div class="timelord-container timelord-timepicker-container" id="timelord-container-' + id + '" timelord-id="' + id + '"><div class="timelord-timepicker-inner"> : </div></div>');
        var inner = container.children('.timelord-timepicker-inner');
        container.inner = inner;
        container.type = "time";
        container.id = id;
        container.input = inputField;
        
        // Store the container in the Timelord field array.
        timelordFields[id] = container;
        
        // Create the input fields
        var hour = $('<input type="number" class="timelord-timefield timelord-hourfield" value="12" min="00" max="23" timelord-id="' + id + '" />');
        var minute = $('<input type="number" class="timelord-timefield timelord-minutefield" value="00" min="00" max="59" step="5" timelord-id="' + id + '" />');
        container.hour = hour;
        container.minute = minute;
        
        // Append the input fields to the container
        inner.prepend(hour);
        inner.append(minute);
        
        // Hook the onChange functions to the fields
        hour.change(onChange_twoDigits);
        hour.change(onChange_timelordInput);
        minute.change(onChange_twoDigits);
        minute.change(onChange_timelordInput);
        
        // If the number field is not supported (not HTML5), and jQueryUI-spinner is available, use that instead.
        if ((hour[0].type != 'number') && $.ui && $.ui.spinner) {
            hour.addClass("timelord-jQuerySpinner");
            minute.addClass("timelord-jQuerySpinner");
            hour.spinner({ stop: onChange_spinner });
            minute.spinner({ stop: onChange_spinner });
        };
        
        // Trigger the change event once to display the correct value initially
        hour.change();
        minute.change();
        
        // Return the container
        return container;
    };
    
    function createDayPicker(inputField) {
        // Select a 10-digit Timelord ID that is not in use
        var id = generateUniqueTimelordID();
        
        // Create the Timelord container
        var container = $('<div class="timelord-container timelord-daypicker-container" id="timelord-container-' + id + '" timelord-id="' + id + '"><div class="timelord-daypicker-inner"></div></div>');
        var inner = container.children('.timelord-daypicker-inner');
        var menu = $('<ul class="timelord-daypicker-daymenu" id="timelord-daypicker-daymenu-' + id + '"></ul>');
        container.inner = inner;
        container.type = "day";
        container.id = id;
        container.input = inputField;
        container.day = 0;
        
        // Store the container in the Timelord field array.
        timelordFields[id] = container;
        
        // Find today's date, to be clicked and set as default
        var now = new Date();
        var nowDay = (now.getDay() + 6) % 7;
        
        // Create the day links
        var days = [];
        for (var i = 0; i < 7; ++i) {
            var daytype = i < 5 ? 'weekday' : 'weekend';
            var day = $('<li class="timelord-daypicker-day ' + daytype + '" day="' + i + '" timelord-id="' + id + '"></li>');
            day.text(options.dayNamesShort[i]);
            day.click(onClick_day);
            if (i == nowDay) { day.click() };
            days[i] = $('<a href="" day="' + i + '" timelord-id="' + id + '"></a>');
            days[i].append(day);
            menu.append(days[i]);
        };
        
        // Append the day links to the container
        inner.prepend(menu);
        
        // Return the container
        return container;
    };
    
    function createDatePicker(inputField) {
        // Select a 10-digit Timelord ID that is not in use
        var id = generateUniqueTimelordID();
        
        // Create the Timelord container
        var container = $('<div class="timelord-container timelord-datepicker-container" id="timelord-container-' + id + '" timelord-id="' + id + '"><div class="timelord-datepicker-inner"></div></div>');
        var inner = container.children('.timelord-datepicker-inner');
        container.inner = inner;
        container.type = "date";
        container.id = id;
        container.input = inputField;
        
        // Store the container in the Timelord field array.
        timelordFields[id] = container;
        
        // Find today's date to set as default
        var now = new Date();
        
        // Set up the month navigation
        var monthNav = $('<div class="timelord-datepicker-monthnav"></div>');
        var monthPrev = $('<a href="" class="timelord-datepicker-monthnav-button timelord-datepicker-monthnav-prev" timelord-id="' + id + '"><div class="timelord-datepicker-monthnav-button timelord-datepicker-monthnav-prev" timelord-id="' + id + '">&lt;</div></a>');
        monthPrev.click(onClick_prevMonth);
        var monthYear = $('<div class="timelord-datepicker-monthnav-monthyear"><span class="timelord-month">January</span> <span class="timelord-year">2012</span></div>');
        var monthNext = $('<a href="" class="timelord-datepicker-monthnav-button timelord-datepicker-monthnav-next" timelord-id="' + id + '"><div class="timelord-datepicker-monthnav-button timelord-datepicker-monthnav-next" timelord-id="' + id + '">&gt;</div></a>');
        monthNext.click(onClick_nextMonth);
        monthNav.append(monthPrev);
        monthNav.append(monthYear);
        monthNav.append(monthNext);
        
        inner.append(monthNav);
        
        // Create the calendar table
        var datetable_container = $('<div class="timelord-datetable-container"></div>');
        inner.append(datetable_container);
        var datetable = $('<table class="timelord-datetable"><thead><tr></tr></thead><tbody></tbody></table>');
        var tablehead = datetable.children('thead');
        var tablebody = datetable.children('tbody');
        var tablehead_row = tablehead.children('tr');
        for (var day = 0; day < 7; ++day) {
            var dayname = $('<th></th>');
            dayname.text(options.dayNamesShort[day]);
            tablehead_row.append(dayname);
        }
        container.cells = [];
        for (var rownum = 0; rownum < 6; ++rownum) {
            container.cells[rownum] = [];
            var row = $('<tr rownum="' + rownum + '"></tr>');
            for (var colnum = 0; colnum < 7; ++colnum) {
                var cell = $('<td class="" colnum="' + colnum + '"></td>');
                var link = $('<a href="" daynum="0" timelord-id="' + id + '"></a>');
                link.click(onClick_date);
                cell.link = link;
                cell.append(link);
                row.append(cell);
                container.cells[rownum][colnum] = cell;
            }
            tablebody.append(row);
        }
        datetable_container.append(datetable);
        
        setSelectedDay(container, now.getFullYear(), now.getMonth() + 1, now.getDate());
        
        return container;
    };
    
    function createDateTimePicker(inputField) {
        // This is essentially a date picker and a time picker combined.
        // Because of the ID generation, however, pickers can't be combined.
        // Create a date picker, and attach two time fields instead.
        var container = createDatePicker(inputField);
        container.type = 'datetime';
        var id = container.id;
        
        // Create a div for the time selector
        var timediv = $('<div class="timelord-datetime-timediv" style="margin: 15px;"> : </div>');
        
        var hour = $('<input type="number" class="timelord-timefield timelord-hourfield" value="12" min="00" max="23" timelord-id="' + id + '" />');
        var minute = $('<input type="number" class="timelord-timefield timelord-minutefield" value="00" min="00" max="59" step="5" timelord-id="' + id + '" />');
        container.hour = hour;
        container.minute = minute;
        
        timediv.prepend(hour);
        timediv.append(minute);
        
        // Hook the onChange functions to the fields
        hour.change(onChange_twoDigits);
        hour.change(onChange_timelordInput);
        minute.change(onChange_twoDigits);
        minute.change(onChange_timelordInput);
        
        // If the number field is not supported (not HTML5), and jQueryUI-spinner is available, use that instead.
        if ((hour[0].type != 'number') && $.ui && $.ui.spinner) {
            hour.addClass("timelord-jQuerySpinner");
            minute.addClass("timelord-jQuerySpinner");
            hour.spinner({ stop: onChange_spinner });
            minute.spinner({ stop: onChange_spinner });
        };
        
        // Trigger the change event once to display the correct value initially
        hour.change();
        minute.change();
        
        container.inner.append(timediv);
        
        // Re-set the current date to update the initial display value
        var now = new Date();
        setSelectedDay(container, now.getFullYear(), now.getMonth() + 1, now.getDate());
        
        // Return the container
        return container;
    };
    
    // This is the Timelord function that will be called when an element is supplied
    $.fn.timelord = function(method, pickerType) {
        switch (method) {
            case 'attach':
            case 'append':
            case 'replace':
                // Create an appropriate picker to hand along
                var picker;
                switch (pickerType.toLowerCase()) {
                    case 'timepicker':
                        picker = createTimePicker(this);
                        break;
                    case 'daypicker':
                        picker = createDayPicker(this);
                        break;
                    case 'datepicker':
                        picker = createDatePicker(this);
                        break;
                    case 'datetimepicker':
                        picker = createDateTimePicker(this);
                        break;
                    default:
                        console.error('Invalid picker type');
                        return this;
                        break;
                };
                
                methods[method](this, picker);
                break;
            default:
                console.error('Invalid method. Try calling without a jQuery element?');
        };
        return this;
    };
    
    // This is the Timelord function that will be called without an element
    // For now, all it does is change options.
    $.extend({
        timelord: function(func, var1, var2) {
            switch (func) {
                case 'option':
                    // Option arguments: optionName, option
                    options[var1] = var2;
                    break;
                default:
                    console.error('Invalid method. Try calling with a jQuery element?');
            };
        }
    });
})( jQuery );