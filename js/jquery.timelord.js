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
        formatDay: '{ dayname }',
        formatDate: '{ dayname } { monthname.short } { day }, { year }',
        formatDateTime: '{ dayname } { monthname.short } { day }, { year } { hour }:{ minute }'
    };
    
    var timelordFields = [
        // A record of existing Timelord fields.
    ];
    var attachedTimelordFields = [
        // A record of all Timelord fields that have been attached, and need to have click handling.
    ];
    
    /***
     * Formatting functions
     ***/
    function digitAt(number, index) {
        // Returns the digit at a given position in a number
        if (isNaN(number)) {
            console.error("Tried to find digit in non-number: " + number);
            return 0;
        };
        var num = Math.abs(parseInt(number));
        var length = Math.ceil(Math.log(num+1) / Math.LN10); // Length of the number
        var pos = (index <= 0) ? -index : length - index + 1;
        
        return Math.floor((num % Math.pow(10, pos + 1)) / Math.pow(10, pos));
    }
    
    var numerals = {
        // For use for converting plain Arabic numbers into other numeral systems
        roman: [
            // Roman numerals
            [1000, "M"],
            [900, "CM"],
            [500, "D"],
            [400, "CD"],
            [100, "C"],
            [90, "XC"],
            [50, "L"],
            [40, "XL"],
            [10, "X"],
            [9, "IX"],
            [5, "V"],
            [4, "IV"],
            [1, "I"]
        ],
        greek: [
            // Greek numerals
            ["", "", ""],
            ["α", "ι", "ρ"],
            ["β", "κ", "σ"],
            ["γ", "λ", "τ"],
            ["δ", "μ", "υ"],
            ["ε", "ν", "φ"],
            ["ϛ", "ξ", "χ"],
            ["ζ", "ο", "ψ"],
            ["η", "π", "ω"],
            ["θ", "ϟ", "ϡ"],
        ],
        eastarabic: ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"], // Eastern Arabic numerals
        persian: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"], // Perso-Arabic numerals
        japanese: {
            digits: [
                "",
                "一",
                "二",
                "三",
                "四",
                "五",
                "六",
                "七",
                "八",
                "九"
            ],
            tens: [
                "",
                "十",
                "百",
                "千"
            ],
            myriads: [
                "",
                "万",
                "億",
                "兆",
                "京",
                "垓",
                "𥝱",
                "穣",
                "溝",
                "澗",
                "正",
                "載",
                "極"
            ]
        }
    }
    
    function toJapanese(num, myriad) {
        // Converts a 4-digit number to Japanese.
        // Internal call; use the string formatting modifier for the complete functionality.
        if (num == 0) { // Special case: No representation of this myriad
            return "";
        }
        if (num == 1000 && myriad > 0) { // Special case: 'issen' before thousands sign. Thanks, Wikipedia.
            return "一千" + numerals.japanese.myriads[myriad];
        }
        
        var r = numerals.japanese.myriads[myriad];
        for (var i = 0; i < 4; ++i) {
            var digit = digitAt(num, -i);
            if (digit > 0) {
                if (digit == 1 && i > 0) {
                    r = numerals.japanese.tens[i] + r
                } else {
                    r = numerals.japanese.digits[digit] + numerals.japanese.tens[i] + r;
                }
            }
        }
        return r;
    }
    
    var format_functions = {
        // These are functions that can be applied to format strings (e.g. { string.function }).
        // They get the string as an argument, and must return the modified string.
        lowercase: function(string) {
            // Converts the string into lower case
            return string.toLowerCase();
        },
        uppercase: function(string) {
            // Converts the string into upper case
            return string.toUpperCase();
        },
        '12clock': function(string) {
            // Formats a string in the form "hh:mm" into a 12-hour format.
            var vals = string.split(":");
            
            if (isNaN(vals[0]) || isNaN(vals[1])) {
                // This is not a time string - can't format
                console.error("Tried to format non-time string into 12-hour format: " + string);
                return string;
            }
            
            var hour = vals[0] % 12;
            var ispm = (vals[0] / 12 >= 1);
            if (hour == 0 && vals[1] == 0) {
                hour = 12;
            }
            
            return hour + ":" + vals[1] + (ispm ? " pm" : " am");
        },
        roman: function(string) {
            // Converts a numeric string into roman numerals.
            // Will return the string as-is (and print a console
            // error) if the string is not a number, or the
            // number is not between 0 and 3999.
            // Note that decimal places will be ignored.
            // If the number is 0, "N" will be returned.
            if (isNaN(string)) {
                console.error("Tried to convert non-number into roman numeral: " + string);
                return string;
            };
            var num = parseInt(string);
            if (num == 0) {
                return "N";
            }
            if (num < 1 || num > 3999) {
                console.error("Number out of range for roman numeral: " + string);
                return string;
            }
            
            var r = "";
            
            while (num > 0) {
                for (var i = 0; i < numerals.roman.length; ++i) {
                    if (numerals.roman[i][0] <= num) {
                        r += numerals.roman[i][1];
                        num -= numerals.roman[i][0];
                        break;
                    }
                }
            }
            
            return r;
        },
        greek: function(string) {
            // TODO: Conversion into Greek numerals
            // For now, just returns the string.
            // Will return the string as-is (and print a console
            // error) if the string is not a number, or the
            // number is not between 1 and 999 999.
            if (isNaN(string)) {
                console.error("Tried to convert non-number into greek numeral: " + string);
                return string;
            };
            
            var num = parseInt(string);
            if (num < 1 || num > 999999) {
                console.error("Number out of range for greek numeral: " + string);
                return string;
            }
            
            var r = "ʹ";
            var length = Math.ceil(Math.log(num+1) / Math.LN10); // Length of the number
            
            for (var i = 0; i < length; ++i) {
                var digit = digitAt(num, -i);
                var greekdigit = numerals.greek[digit][i % 3];
                r = greekdigit + r;
            }
            
            if (num > 999) {
                r = "͵" + r;
            }
            
            return r;
        },
        eastarabic: function(string) {
            if (isNaN(string)) {
                console.error("Tried to convert non-number into eastern arabic numeral: " + string);
                return string;
            };
            
            var r = "";
            for (var i = 0; i < string.length; ++i) {
                r = r + numerals.eastarabic[string.charAt(i)];
            }
            return r;
        },
        persian: function(string) {
            if (isNaN(string)) {
                console.error("Tried to convert non-number into persian-arabic numeral: " + string);
                return string;
            };
            
            var r = "";
            for (var i = 0; i < string.length; ++i) {
                r = r + numerals.persian[string.charAt(i)];
            }
            return r;
        },
        japanese: function(string) {
            if (isNaN(string)) {
                console.error("Tried to convert non-number into japanese numeral: " + string);
                return string;
            };
            var num = parseInt(string);
            if (num == 0) {
                return "零";
            }
            
            r = "";
            if (num < 0) {
                r = "マイナス";
                num = -num;
            }
            
            var i = 0;
            while (num > 0) {
                var next = num.toString().slice(-4);
                var add = toJapanese(next, i);
                r = add + r;
                
                num = num.toString().slice(0, -4);
                ++i;
            }
            
            return r;
        },
        short: function(string) {
            // Returns the short version of a day, month or year.
            // If the string is a year (any number), then the last
            // two digits will be returned. If it is not, then
            // the month list will be checked first, then the
            // day list. If there are identical entries in both,
            // then the month's short value will be returned.
            if (!isNaN(string)) {
                var num = parseInt(string);
                var r = num % 100;
                return r.toString();
            }
            
            var index = options.monthNames.indexOf(string);
            if (index == -1) {
                // Not found in months - look in days
                index = options.dayNames.indexOf(string);
                if (index == -1) {
                    // Not found in days either - just return the string and print an error
                    console.error("Could not find month or day: " + string);
                    return string;
                }
                
                return options.dayNamesShort[index];
            }
            return options.monthNamesShort[index];
        },
        zeropad2: function(string) {
            // Fills in leading 0s until a string has at least 2 characters.
            var s = string.toString(); // In case it isn't a string already
            while (s.length < 2) {
                s = '0' + s;
            }
            return s
        },
        zeropad4: function(string) {
            // Fills in leading 0s until a string has at least 4 characters.
            var s = string.toString(); // In case it isn't a string already
            while (s.length < 4) {
                s = '0' + s;
            }
            return s
        },
        ordinal: function(string) {
            // Adds an ordinal suffix to the number
            if (isNaN(string)) {
                console.error("Tried to add ordinal suffix to non-number: " + string);
                return string;
            };
            
            var num = parseInt(string);
            if (num < 0) {
                console.error("Tried to add ordinal suffix to negative number: " + string)
                return string
            }
            
            if (digitAt(num, -1) == 1) {
                return string + "th"
            } else {
                switch (digitAt(num, 0)) {
                    case 1:
                        return string + "st"
                    case 2:
                        return string + "nd"
                    case 3:
                        return string + "rd"
                    default:
                        return string + "th"
                }
            }
        }
    };
    
    function format_apply(string, funcname) {
        if (format_functions[funcname]) {
            return format_functions[funcname](string);
        } else {
            return string;
        }
    };
    
    var replace_re = new RegExp('{[!:]*\\s*[a-zA-Z0-9.]+\\s*}');
    var inner_re = new RegExp('[a-zA-Z0-9.]+');
    function format(string, values, values2) {
        values2 = values2 || {};
        var r = string;
        var match = r.match(replace_re);
        while (match) {
            // For each match that is found:
            var noeval = (match[0].charAt(1) == '!');
            var prio_custom = (match[0].charAt(1) == ':');
            var cmd = match[0].match(inner_re)[0];
            var list = cmd.split(".");
            var rep = '';
            if (prio_custom) {
                rep = values2[list[0]] || values[list[0]] || "";
            } else {
                rep = (noeval) ? list[0] : (values[list[0]] || values2[list[0]] || "");
            }
            rep = rep.toString();
            for (var i = 1; i < list.length; ++i) { // 0 will be the initial value, so start at 1
                rep = format_apply(rep, list[i]);
            }
            
            r = r.replace(match[0], rep);
            match = r.match(replace_re);
        };
        return r;
    };
    
    /***
     * Reacting to changes and clicks
     ***/
    
    function onOption_change(optionName, optionValue) {
        // Called when an option is changed.
        // Updates all relevant strings.
        for (i in timelordFields) {
            var picker = timelordFields[i];
            switch (optionName) {
                case 'dayNames':
                case 'dayNamesShort':
                    // Affects: Day picker, date picker, datetime picker
                    switch (picker.type) {
                        case 'day':
                            for (i in picker.days) {
                                var dayli = picker.days[i].find("li.timelord-daypicker-day");
                                dayli.text(options.dayNamesShort[i]);
                            }
                            break;
                        case 'date':
                        case 'datetime':
                            picker.find('th.timelord-datetable-day-header').each(function() {
                                $(this).text(options.dayNamesShort[$(this).attr('day')]);
                            });
                            break;
                    }
                    break;
                case 'monthNames':
                case 'monthNamesShort':
                    // Affects: Date picker, datetime picker
                    if (picker.type == 'date' || picker.type == 'datetime') {
                        // It's enough to re-display the current month; that'll reload the month name
                        setDisplayMonth(picker, picker.year, picker.month)
                    }
                    break;
                case 'formatTime':
                case 'formatDay':
                case 'formatDate':
                case 'formatDateTime':
                    // Formatting has changed.
                    // Update each picker's input field's value.
                    picker.input.val(getValue(picker));
                    break;
            }
        }
    }
    
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
        picker.input.val(value).change();
    };
    
    function onChange_fieldInput(event) {
        // Called when the value of the original field changes.
        // This was originally handled by the above function, but
        // a change was needed in that that would cause an infinite
        // loop on these fields.
        var picker = timelordFields[Number($(event.target).attr('timelord-id'))];
        var value = getValue(picker);
        picker.input.val(value);
    }
    
    function onChange_spinner(event) {
        // jQueryUI spinners don't work with simple change events.
        // This is used instead.
        onChange_twoDigits(event);
        onChange_timelordInput(event);
    };
    
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
    };
    
    function onClick_prevMonth(event) {
        event.preventDefault();
        
        var picker = timelordFields[Number($(event.currentTarget).attr('timelord-id'))];
        
        setDisplayMonth(picker, picker.displayYear, picker.displayMonth - 1);
    };
    
    function onClick_nextMonth(event) {
        event.preventDefault();
        
        var picker = timelordFields[Number($(event.currentTarget).attr('timelord-id'))];
        
        setDisplayMonth(picker, picker.displayYear, picker.displayMonth + 1);
    };
    
    function onClick_date(event) {
        // Called when a calendar date is clicked.
        event.preventDefault();
        
        var day = $(event.currentTarget).attr('daynum');
        var picker = timelordFields[Number($(event.currentTarget).attr('timelord-id'))];
        
        setSelectedDay(picker, picker.displayYear, picker.displayMonth, day);
    };
    
    function onClick_attachedTimelordField(event) {
        event.stopPropagation();
    };
    
    function onFocus_attachedInput(event) {
        $(event.currentTarget).blur();
        timelordFields[Number($(event.currentTarget).attr('timelord-id'))].show();
    };
    
    $(document).click(function(event) {
        for (var i in attachedTimelordFields) {
            attachedTimelordFields[i].hide();
        }
    });
    
    /***
     * ID generation
     ***/
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
            
            var clearfloat = $('<div class="timelord-clear">');
            
            picker.addClass('timelord-attached');
            picker.click(onClick_attachedTimelordField);
            attachedTimelordFields[picker.id] = picker;
            inputTag.after(picker);
            inputTag.after(clearfloat);
            inputTag.attr('timelord-id', picker.id);
            
            inputTag.click(onClick_attachedTimelordField);
            inputTag.keyup(onChange_fieldInput);
            inputTag.change(onChange_fieldInput);
            inputTag.focus(onFocus_attachedInput);
        },
        'append': function(inputTag, picker) {
            // Appends a Timelord field to the specified input tag.
            // The Timelord field will appear as part of the page, and will
            // remain visible.
            
            inputTag.attr('timelord-id', picker.id);
            inputTag.after(picker);
            inputTag.keyup(onChange_fieldInput);
            inputTag.change(onChange_fieldInput);
        },
        'replace': function(inputTag, picker) {
            // Replaces an input tag with a Timelord field.
            // This is a visual change; the input tag will simply be hidden,
            // and all information in the Timelord field will be sent to the
            // input tag.
            
            inputTag.attr('timelord-id', picker.id);
            inputTag.after(picker);
            inputTag.hide();
            inputTag.keyup(onChange_fieldInput);
            inputTag.change(onChange_fieldInput);
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
        console.log(picker.formatVars);
        return "";
    };
    
    function getTimePickerValue(picker) {
        var hour = picker.hour.val();
        var minute = picker.minute.val();
        
        return format(options.formatTime, { hour: hour, minute: minute, time: hour + ":" + minute }, picker.formatVars);
    };
    
    function getDayPickerValue(picker) {
        var day = picker.day;
        
        return format(options.formatDay, { dayname: options.dayNames[day] }, picker.formatVars);
    };
    
    function getDatePickerValue(picker) {
        var year = picker.year;
        var month = picker.month;
        var day = picker.day;
        
        var dto = new Date(year, month - 1, day);
        var weekday = (dto.getDay() + 6) % 7;
        
        return format(options.formatDate, {
            year: year,
            month: month,
            day: day,
            monthname: options.monthNames[month-1],
            dayname: options.dayNames[weekday]
        }, picker.formatVars);
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
            month: month,
            day: day,
            hour: hour,
            minute: minute,
            time: hour + ":" + minute,
            monthname: options.monthNames[month-1],
            dayname: options.dayNames[weekday]
        }, picker.formatVars);
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
        
        var dto = new Date(year, month - 1, 1);
        var lastDayDto = new Date(year, month, 0);
        
        year = dto.getFullYear();
        month = dto.getMonth() + 1;
        
        if (!day) { day = ((month == picker.month && year == picker.year) ? picker.day : 0); };
        
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
        container.days = days;
        for (var i = 0; i < 7; ++i) {
            var daytype = i < 5 ? 'weekday' : 'weekend';
            var day = $('<li class="timelord-daypicker-day ' + daytype + '" day="' + i + '" timelord-id="' + id + '"></li>');
            day.text(options.dayNamesShort[i]);
            day.click(onClick_day);
            if (i == nowDay) { day.click() };
            days[i] = $('<a href="" class="timelord-day-link" day="' + i + '" timelord-id="' + id + '"></a>');
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
            var dayname = $('<th class="timelord-datetable-day-header" day="' + day + '"></th>');
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
            case 'format':
                // In this case, pickerType holds the provided format variables object.
                // The input tag must already have a Timelord field attached to it.
                var picker = timelordFields[Number(this.attr('timelord-id'))];
                if (!picker) {
                    console.error("Tried to assign variables to non-Timelord input field")
                    return this;
                }
                picker.formatVars = pickerType;
                picker.input.val(getValue(picker));
                break;
            case 'update':
                var picker = timelordFields[Number(this.attr('timelord-id'))];
                if (!picker) {
                    console.error("Tried to update non-Timelord input field")
                    return this;
                }
                picker.input.val(getValue(picker));
                break;
            case 'set':
                // Sets a value (day (weekday), date, time or datetime) (type will be in pickerType)
                var picker = timelordFields[Number(this.attr('timelord-id'))];
                if (!picker) {
                    console.error("Tried to set non-Timelord input field")
                    return this;
                }
                switch (pickerType.toLowerCase()) {
                    case 'day':
                        // Available for day-pickers.
                        // Arguments:
                        //      day     Numeric weekday (Monday=0, Sunday=6)
                        if (picker.type != 'day') break;
                        
                        var day = parseInt(arguments[2])
                        
                        console.log(picker.find('a[day=' + day + '] li'))
                        picker.find('a[day=' + day + '] li').click()
                        break;
                    case 'date':
                        // Available for date- and datetime-pickers.
                        // Arguments:
                        //      year    Numeric year
                        //      month   Numeric month (Jan=1, Dec=12)
                        //      day     Numeric day of the month (1-based)
                        if (picker.type != 'date' && picker.type != 'datetime') break;
                        var year = parseInt(arguments[2])
                        var month = parseInt(arguments[3])
                        var day = parseInt(arguments[4])
                        
                        setSelectedDay(picker, year, month, day)
                        break;
                    case 'time':
                        // Available for time- and datetime-pickers
                        if (picker.type != 'time' && picker.type != 'datetime') break;
                        // Arguments:
                        //      hour    Hour (24-hour)
                        //      minute  Minute
                        var hour = parseInt(arguments[2])
                        var minute = parseInt(arguments[3])
                        
                        picker.find('.timelord-hourfield').val(hour).change()
                        picker.find('.timelord-minutefield').val(minute).change()
                        
                        // Update the original input field with the new time value
                        picker.input.val(getValue(picker));
                        break;
                    case 'datetime':
                        if (picker.type != 'datetime') break;
                        // Available for datetime-pickers
                        // Arguments: 'date' and 'time' combined
                        var year = parseInt(arguments[2])
                        var month = parseInt(arguments[3])
                        var day = parseInt(arguments[4])
                        var hour = parseInt(arguments[5])
                        var minute = parseInt(arguments[6])
                        
                        setSelectedDay(picker, year, month, day)
                        picker.find('.timelord-hourfield').val(hour)
                        picker.find('.timelord-minutefield').val(minute)
                        
                        // Update the original input field with the new time value
                        picker.input.val(getValue(picker));
                        break;
                }
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
                    onOption_change(var1, var2);
                    break;
                default:
                    console.error('Invalid method. Try calling with a jQuery element?');
            };
        }
    });
})( jQuery );