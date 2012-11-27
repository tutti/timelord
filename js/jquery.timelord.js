(function($) {
    // The number of digits in a Timelord field ID.
    // 10 should be enough for most uses; if you run into problems with this,
    // change this variable.
    var numIDDigits = 10;
    
    // These are default format strings for outputting the various time data.
    // TODO: Implement
    var formats = {
        time: '',
        day: '',
        date: '',
        datetime: ''
    };
    
    var attachedTimelordFields = [
        // A record of all Timelord fields that have been attached, and need to have click handling.
    ];
    
    /***
     * Input field formatting
     ***/
    
    function onChange_twoDigits(event) {
        // Makes a minute or hour field always display two digits.
        // Will not affect fields with more than two digits.
        var value = $(event.currentTarget).val()
        if (value.length == 1) {
            $(event.currentTarget).val("0" + value)
        }
    };
    
    function onChange_timelordInput(event) {
        // Called from any input field in a Timelord field
        // Finds the corresponding Timelord field, gets its
        // string value, and changes the corresponding
        // input field to match.
        console.log($(event.currentTarget).attr('timelord-id'));
        
        var picker = timelordFields[Number($(event.currentTarget).attr('timelord-id'))];
        var value = getValue(picker);
        picker.input.val(value);
    };
    
    function onChange_stopPropagate(event) {
        // Prevents an event from propagating further.
        // Used to prevent a click event from reaching the window,
        // which will hide all attached elements.
        event.stopPropagation();
    }
    
    function onChange_windowClick() {
        // Called when a click is registered anywhere.
        // Hides all attached Timelord fields.
        // Should not be called when a Timelord field or its
        // corresponding input field is clicked; stop
        // event propagation to prevent this.
        for (i in attachedTimelordFields) {
            attachedTimelordFields[i].css('display', 'none');
        };
    };
    $(document).click(onChange_windowClick);
    
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
            
            inputTag.before('<div class="timelord-attach-container">');
            inputTag.after('</div>');
            
            picker.addClass('timelord-attached');
            //picker.click(onChange_stopPropagate);
            inputTag.after(picker);
            //inputTag.click(onChange_stopPropagate);
            //inputTag.focus(function() {
            //    picker.css('display', 'block');
            //});
            //attachedTimelordFields[picker.id] = picker;
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
        }
    };
    
    /***
     * Value retrievers
     * These functions return a formatted string representing the values entered
     * into their fields.
     * TODO: Proper formatting, rather than hardcoded.
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
    }
    
    function getTimePickerValue(picker) {
        var hour = picker.hour.val();
        var minute = picker.minute.val();
        
        // Formatting here
        return hour + ":" + minute;
    };
    
    function getDayPickerValue(picker) {
        
    };
    
    function getDatePickerValue(picker) {
        
    };
    
    function getDateTimePickerValue(picker) {
        
    };
    
    /***
    * Picker creators
    * Creates and returns a picker. The picker will not be inserted anywhere
    * in the HTML as a direct result of calling one of these.
    ***/
    function createTimePicker(inputField) {
        // Select a 10-digit Timelord ID that is not in use
        var id = generateUniqueTimelordID();
        
        // Create the Timelord container
        var container = $('<div class="timelord-container timelord-timepicker-container" id="timelord-container-' + id + '"><div class="timelord-timepicker-inner"> : </div></div>');
        var inner = container.children('.timelord-timepicker-inner');
        container.type = "time";
        container.id = id;
        container.input = inputField;
        
        // Create the input fields
        var hour = $('<input type="number" class="timelord-timefield timelord-hourfield" value="12" min="00" max="23" timelord-id="' + id + '" />');
        var minute = $('<input type="number" class="timelord-timefield timelord-minutefield" value="00" min="00" max="59" step="5" timelord-id="' + id + '" />');
        container.hour = hour;
        container.minute = minute;
        hour.picker = container;
        minute.picker = container;
        
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
            hour.spinner();
            minute.spinner();
        };
        
        // Store the container in the Timelord field array.
        timelordFields[id] = container;
        
        // Return the container
        return container;
    };
    
    function createDayPicker() {
        
    };
    
    function createDatePicker() {
        
    };
    
    function createDateTimePicker() {
        
    };
    
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
            case 'setFormat':
                break;
            case 'setGlobalFormat':
                break;
        };
        return this;
    };
})( jQuery );