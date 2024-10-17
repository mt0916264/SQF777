document.addEventListener('DOMContentLoaded', function() {
    // console.warn('DOM fully loaded and parsed');

    const cardNumberInput = document.getElementById('card-number');
    const cvvInput = document.getElementById('card-cvc');
    const expirationInput = document.getElementById('card-expiry');
    const form = document.getElementById('payment-form');
    const payButton = document.getElementById('pay-button');
    const lockIcon = payButton.querySelector('.Icon--square');

    let previousValueCardNumber = '';
    let previousValueCvv = '';
    let previousValueCardExpiry = '';
    let cardType = '';
    let cardNumberInvalid = false;
    let expiryIsValid = false;
    let expiryHasError = false;

    const staticIcons = document.querySelectorAll('.card-brand-icon:not(.dynamic)');
    const dynamicIcons = document.querySelectorAll('.card-brand-icon.dynamic');
    const invalidCardIcon = document.querySelector('.invalid-card-icon');
    const cvc3digitIcon = document.querySelector('.cvc-icon.cvc-3digit');
    const cvc4digitIcon = document.querySelector('.cvc-icon.cvc-4digit');
    let currentDynamicIndex = 0;
    let rotationInterval;
    let last_icon_selected = 'allicons'
    function detectCardType(cardNumber) {
        const patterns = {
            visa: /^4/,
            mastercard: /^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[0-1]\d|2720)/,
            amex: /^3[47]/,
            discover: /^6(?:011|5)/,
            dinersclub: /^3(?:0[0-5]|[68])/,
            jcb: /^(?:2131|1800|35)/ // JCB pattern to match prefix only
        };
        for (const [card, pattern] of Object.entries(patterns)) {
            if (pattern.test(cardNumber)) {
                return card;
            }
        }
        return '';
    }

    function validateCVV(showError = false) {
        const cvv = cvvInput.value.trim();
        const inputId = 'card-cvc';

        if (!cvv) {
            hideErrorMessage('card-cvc')
            // cvvInput.style.color = '';
        }

        // console.warn('Validating CVV:', cvv, 'Card Type:', cardType, 'Show Error:', showError);

        // Ensure CVV contains only digits
        if (!/^\d*$/.test(cvv)) {
            if (showError) {
                showErrorMessage(inputId, "CVV must contain only digits.");
            }

            // cvvInput.style.color = 'red';
            cvvInput.classList.add('error');
            return false;
        }

        let isValid = false;
        let maxLength = 4;
        let errorMessage = '';

        const newCardType = detectCardType(cardNumberInput.value);

        if (newCardType === 'amex') {
            isValid = cvv.length === 4;
            maxLength = 4;
            if (cvv.length !== 4) {
                errorMessage = "Incorrect CVV for Amex. It should be 4 digits.";
            }
        } else if (newCardType) {
            isValid = cvv.length === 3;
            maxLength = 3;
            if (cvv.length !== 3) {
                errorMessage = `Incorrect CVV for ${newCardType}. It should be 3 digits.`;
            }
        } else {
            isValid = cvv.length === 3 || cvv.length === 4;
            if (cvv.length < 3) {
                errorMessage = "Your card's security code is incomplete.";
            }
        }

        cvvInput.setAttribute('maxlength', maxLength);

        if (!isValid && showError) {
            showErrorMessage(inputId, errorMessage);
            // cvvInput.style.color = 'red';
            cvvInput.classList.add('error');
        } else if (isValid) {
            hideErrorMessage(inputId);
            // cvvInput.style.color = '';
            cvvInput.classList.remove('error');
        }

        // Toggle CVC SVGs based on length
        if (cvv.length === 4) {
            cvc3digitIcon.classList.remove('active');
            cvc4digitIcon.classList.add('active');
        } else {
            cvc3digitIcon.classList.add('active');
            cvc4digitIcon.classList.remove('active');
        }

        return isValid;
    }

    function validateCardNumber() {
        const cardNumber = cardNumberInput.value.replace(/\s+/g, '');
        const cardType = detectCardType(cardNumber);
        
        // Check card number length
        let isValidLength = false;
        switch (cardType) {
            case 'amex':
                isValidLength = cardNumber.length === 15;
                break;
            case 'dinersclub':
                isValidLength = cardNumber.length === 14;
                break;
            case 'jcb':
                isValidLength = cardNumber.length === 16 || cardNumber.length === 19;
                break;
            default:
                isValidLength = cardNumber.length === 16;
        }

        if (!isValidLength) {
            return false;
        }

        // Luhn algorithm
        let sum = 0;
        let isEven = false;
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i), 10);
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
            isEven = !isEven;
        }
        return (sum % 10 === 0);
    }

    function updateCardNumberUI() {
        const cardNumber = cardNumberInput.value.replace(/\s+/g, '');
        const inputId = 'card-number';
        const cardType = detectCardType(cardNumber);
        const isValid = validateCardNumber();

        if (cardNumber.length > 0) {
            if (cardType === 'jcb') {
                if (cardNumber.length < 16) {
                    showErrorMessage(inputId, 'Your card number is incomplete.');
                    cardNumberInvalid = true;
                } else if (cardNumber.length === 16 || cardNumber.length === 19) {
                    if (!isValid) {
                        showErrorMessage(inputId, 'Your card number is invalid.');
                        cardNumberInvalid = true;
                    } else {
                        hideErrorMessage(inputId);
                        cardNumberInvalid = false;
                    }
                } else {
                    showErrorMessage(inputId, 'Your card number is incomplete.');
                    cardNumberInvalid = true;
                }
            } else {
                const expectedLength = cardType === 'amex' ? 15 : cardType === 'dinersclub' ? 14 : 16;
                if (cardNumber.length < expectedLength) {
                    showErrorMessage(inputId, 'Your card number is incomplete.');
                    cardNumberInvalid = true;
                } else if (!isValid) {
                    showErrorMessage(inputId, 'Your card number is invalid.');
                    cardNumberInvalid = true;
                } else {
                    hideErrorMessage(inputId);
                    cardNumberInvalid = false;
                }
            }
        } else {
            hideErrorMessage(inputId);
            cardNumberInvalid = false;
        }

        if (cardNumberInvalid) {
            cardNumberInput.classList.add('error');
            hideAllIcons();
            showInvalidCardIcon();
        } else {
            cardNumberInput.classList.remove('error');
            hideInvalidCardIcon();
            if (cardType) {
                showSingleIcon(cardType);
            } else {
                showAllIcons();
            }
        }

        updatePayButtonState();
    }
    function showStaticIcons() {
        // console.warn('Showing static icons');
        // staticIcons.forEach(icon => icon.style.display = 'inline-block');
        staticIcons.forEach(icon => icon.classList.add('active'));
    }

    function showAllIcons() {
        // console.warn('Show all icons');
        /*
        staticIcons.forEach(icon => {
            icon.classList.add('active')
        });
        */

        if (last_icon_selected != 'allicons') {
            stopIconRotation()
            startIconRotation()
            last_icon_selected = 'allicons'
        }

        hideInvalidCardIcon();
    }

    function hideAllIcons() {
        // stopIconRotation()
        last_icon_selected = 'hideAllIcons'


        // console.warn('Hiding all icons');
        staticIcons.forEach(icon => {
            icon.classList.remove('active')
        });
        dynamicIcons.forEach(icon => {
            icon.classList.remove('active');
        });
    }

    function rotateDynamicIcons() {
        dynamicIcons.forEach((icon, index) => {
            if (index === currentDynamicIndex) {
                icon.classList.add('active');
            } else {
                icon.classList.remove('active');
            }
        });
        currentDynamicIndex = (currentDynamicIndex + 1) % dynamicIcons.length;
    }

    function startIconRotation() {
        // console.warn('Starting icon rotation');
        if (rotationInterval) clearInterval(rotationInterval);
        showStaticIcons();
        rotateDynamicIcons();
        rotationInterval = setInterval(rotateDynamicIcons, 2000);
    }

    function stopIconRotation() {
        // console.warn('Stopping icon rotation');
        if (rotationInterval) clearInterval(rotationInterval);
    }

    function showSingleIcon(cardType) {
        // console.warn('Showing single icon for card type:', cardType);
        last_icon_selected = 'singleicon'
        stopIconRotation();
        hideAllIcons();
        const icon = document.querySelector(`.card-${cardType}`);
        if (icon) {
            // icon.style.display = 'inline-block';
            if (icon.classList.contains('dynamic')) {
                icon.classList.add('active');
            } else {
                icon.classList.add('active');
            }
        }

        hideInvalidCardIcon();
    }

    function formatCardNumber(value) {
        // console.warn('Formatting card number:', value);
        const cardType = detectCardType(value);
        let formattedValue = '';
        if (cardType === 'amex') {
            formattedValue = value.replace(/(\d{4})(\d{0,6})(\d{0,5})/, '$1 $2 $3').trim();
        } else if (cardType === 'dinersclub') {
            formattedValue = value.replace(/(\d{4})(\d{0,6})(\d{0,4})/, '$1 $2 $3').trim();
        } else if (cardType === 'jcb') {
            formattedValue = value.replace(/(\d{4})(\d{4})(\d{4})(\d{0,4})(\d{0,3})/, '$1 $2 $3 $4 $5').trim();
        } else {
            formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
        }
        // console.warn('Formatted card number:', formattedValue);
        return formattedValue;
    }

    function handleCardNumberInput(e) {
        // console.warn('Card number input event');
        const input = e.target;
        const selectionStart = input.selectionStart;
        const prevValue = input.value;

        let value = input.value.replace(/\D/g, '');
        const cardTypeDetected = detectCardType(value);
        let maxLength;

        if (cardTypeDetected === 'amex') {
            maxLength = 15;
        } else if (cardTypeDetected === 'dinersclub') {
            maxLength = 14;
        } else if (cardTypeDetected === 'jcb') {
            maxLength = 19; // JCB can have up to 19 digits
        } else {
            maxLength = 16;
        }

        value = value.slice(0, maxLength);
        const formattedValue = formatCardNumber(value);

        input.value = formattedValue;
        if (previousValueCardNumber == value.trim()) {
            updatePayButtonState();
            return
        } else {
            previousValueCardNumber = value.trim()
            hideErrorMessage('card-number');
            input.classList.remove('error');
            input.style.color = '';
            hideInvalidCardIcon();
        }

        let newCursorPos = selectionStart + (formattedValue.length - prevValue.length);
        input.setSelectionRange(newCursorPos, newCursorPos);

        if (cvvInput.value.length) {
            validateCVV(true)
        }

        if (!input.value) {
            hideErrorMessage('card-number');
            input.classList.remove('error');
            input.style.color = '';
            hideInvalidCardIcon();
        }

        const newCardType = detectCardType(value);
        cardType = newCardType;
        if (cardType) {
            showSingleIcon(cardType);
        } else {
            showAllIcons()
        }

        updatePayButtonState();

        if (!/^\d*$/.test(e.data)) {
            event.preventDefault();
            return
        }

        hideErrorMessage('card-number');

        // hide error when numner input
        /*
            cvvInput.classList.remove('error');
            hideErrorMessage('card-cvc')
        */
        input.classList.remove('error');
        input.style.color = '';
        hideInvalidCardIcon();

        /*
        if ((newCardType == '' && cardType == '') || newCardType !== cardType) {
            // console.warn('Card type changed from', cardType, 'to', newCardType);
            cardType = newCardType;
            if (cardType) {
                // console.warn(cardType, 'cardTypecardTypecardType')
                showSingleIcon(cardType);
            } else {
                showAllIcons()
                // showInvalidCardIcon(); // Show invalid icon if card is invalid
            }
        }
        */

        updatePayButtonState();
    }

    function handleCardNumberPaste(e) {
        // console.warn('Card number paste event');
        cardNumberInput.classList.remove('error');
        // cardNumberInput.style.color = '';
        cardNumberInvalid = false;
        hideErrorMessage('card-number');
        hideInvalidCardIcon();
        updatePayButtonState();
    }

    function showInvalidCardIcon() {
        // console.warn('Showing invalid card icon');
        hideAllIcons(); // Ensure all other icons are hidden
        invalidCardIcon.classList.add('active'); // Show the invalid card icon
        stopIconRotation()
        last_icon_selected = 'erroricon'
    }

    function hideInvalidCardIcon() {
        // console.warn('Hiding invalid card icon');
        invalidCardIcon.classList.remove('active');
    }

    function validateExpiryInput() {
        const value = expirationInput.value.replace(/\D/g, '');
        
        // Check for the new '0' state
        if (value.length === 1 && value === '0') {
            return false;
        }
        
        // Check if the input is complete (should be 4 digits: 2 for month, 2 for year)
        if (value.length !== 4) {
            return false;
        }
        
        const month = parseInt(value.slice(0, 2), 10);
        const year = parseInt('20' + value.slice(2), 10);
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
        
        // Check if the month is valid (01-12)
        if (month < 1 || month > 12) {
            return false;
        }
        
        // Check if the year is valid (not in the past)
        if (year < currentYear) {
            return false;
        }
        
        // If it's the current year, check if the month is valid (not in the past)
        if (year === currentYear && month < currentMonth) {
            return false;
        }
        
        // If we've passed all checks, the expiry date is valid
        return true;
    }

    function handleExpiryInput(e) {
        const input = e.target;
        let value = input.value.replace(/\D/g, ''); // Remove any non-numeric characters
        const prevValue = input.dataset.previousValue || '';
    
        // Always remove error styling when user starts editing
        if (input.classList.contains('error')) {
            input.classList.remove('error');
            input.style.color = '';
            hideErrorMessage('card-expiry');
        }
    
        // Handle backspace
        if (e.inputType === 'deleteContentBackward') {
            if (value.length === 1 && prevValue.length === 2) {
                // If we've gone from 2 digits to 1, keep the remaining digit
                input.value = value;
                input.dataset.previousValue = value;
                expiryIsValid = validateExpiryInput();
                updatePayButtonState();
                return;
            }
        }
    
        // If the value is all zeros, set it to an empty string
        if (value === '00' || value === '000' || value === '0000') {
            input.value = '';
            input.dataset.previousValue = '';
            expiryIsValid = validateExpiryInput();
            updatePayButtonState();
            return;
        }
    
        // Always limit to 4 digits
        value = value.slice(0, 4);
    
        let month, year;
    
        if (value.length === 1) {
            // Single digit input
            if (value === '0' || value === '1') {
                // Allow '0' or '1' to be entered normally
                month = value;
            } else {
                // Immediately format other single digits with leading zero
                month = '0' + value;
            }
            year = '';
        } else if (value.length >= 2) {
            // Two or more digits
            if (parseInt(value.slice(0, 2)) > 12) {
                // If first two digits are > 12, adjust
                month = '0' + value[0];
                year = value.slice(1, 3); // Only take up to 2 digits for year
            } else {
                // Otherwise, take first two digits as month
                month = value.slice(0, 2);
                year = value.slice(2, 4); // Only take up to 2 digits for year
            }
        }
    
        // Combine month and year, ensuring we only have 4 digits total
        value = (month + year).slice(0, 4);
    
        // Format with separator
        if (value.length > 2) {
            value = value.slice(0, 2) + ' / ' + value.slice(2);
        }
    
        input.value = value;
        input.dataset.previousValue = value.replace(/\D/g, '');
    
        expiryIsValid = validateExpiryInput();
        updatePayButtonState();
    }
    
    
    
    
    
    
    function handleExpiryBlur() {
        const inputId = 'card-expiry';
        const value = expirationInput.value.replace(/\D/g, '');
    
        if (value.length > 0 && value.length < 4) {
            expiryHasError = true;
            expirationInput.classList.add('error');
            expirationInput.style.color = 'red';
            showErrorMessage(inputId, "Your card's expiration date is incomplete.");
        } else if (value.length === 4) {
            const month = parseInt(value.slice(0, 2), 10);
            const year = parseInt('20' + value.slice(2), 10);
    
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
    
            if (year < currentYear || (year === currentYear && month < currentMonth)) {
                expiryHasError = true;
                expirationInput.classList.add('error');
                expirationInput.style.color = 'red';
                showErrorMessage(inputId, "Your card's expiration year is in the past or your card is expired.");
            } else {
                hideErrorMessage(inputId);
                expiryHasError = false;
                expirationInput.classList.remove('error');
                expirationInput.style.color = '';
            }
        } else {
            hideErrorMessage(inputId);
            expiryHasError = false;
            expirationInput.classList.remove('error');
            expirationInput.style.color = '';
        }
    
        updatePayButtonState();
    }


    function handleExpiryBackspace(value) {
        if (value.length === 1) {
            return '0';
        } else if (value.length === 2) {
            const month = parseInt(value);
            if (month <= 9) {
                return '0';
            } else {
                return '0' + value[0];
            }
        }
        return value;
    }

    function handleExpiryKeyDown(e) {

        /*
        let value = e.target.value.replace(/\D/g, '');
        console.warn(e, e.key, e.keyCode, 'e')
        if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Tab', 'Home', 'End', 'Backspace', 'Unidentified'].includes(e.key)) {
            // 'Unidentified'
            // keyCode == '229'
            e.preventDefault()
            return
        }

        if (e.key === 'Backspace') {

            const ele = document.getElementById(e.target.id)
            hideErrorMessage(e.target.id);
            ele.style.color = '';
            ele.classList.remove('error');
            ele.classList.remove('active');

            if (e.target.id == 'card-number') {
                if (cvvInput.value.length) {
                    validateCVV(true)
                }
                hideInvalidCardIcon();
            }
        }
        */
    }

    function handleFocus(e) {
        try {
            switch(e.target.id) {
                case 'card-number':
                    previousValueCardNumber = e.target.value.replace(/\D/g, '')
                    break;
                case 'card-expiry':
                    previousValueCardExpiry = e.target.value.replace(/\D/g, '')
                    break;
                case 'card-cvc':
                    previousValueCvv = e.target.value.replace(/\D/g, '')
                    break;
                default:
            }
            console.log(previousValueCardNumber, e.target.id, 'e')
        } catch(err) {
            console.error(err)
        }
    }

    function handleExpiryBlur() {
        // console.warn('Expiry blur event');
        const inputId = 'card-expiry';
        const value = expirationInput.value.replace(/\D/g, '');

        // Check for incomplete expiration date
        if (value.length > 0 && value.length < 4) {
            expiryHasError = true;
            expirationInput.classList.add('error');
            expirationInput.style.color = 'red';
            showErrorMessage(inputId, "Your card's expiration date is incomplete.");
        } else if (value.length === 4) {
            const month = parseInt(value.slice(0, 2), 10);
            const year = parseInt('20' + value.slice(2), 10);

            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;

            if (year < currentYear || (year === currentYear && month < currentMonth)) {
                expiryHasError = true;
                expirationInput.classList.add('error');
                expirationInput.style.color = 'red';
                showErrorMessage(inputId, "Your card's expiration year is in the past or your card is expired.");
            } else {
                hideErrorMessage(inputId);
            }
        } else {
            hideErrorMessage(inputId);
        }

        updatePayButtonState();
    }


    function handleButtonProcessingState() {
        // console.warn('Processing payment');
        const buttonText = payButton.querySelector('span');
        const iconContainer = payButton.querySelector('.SubmitButton-IconContainer');

        // Change button text to "Processing..."
        buttonText.textContent = 'Processando...';

        // Replace the icon with the loading circle
        iconContainer.innerHTML = `
            <div class="Icon Icon--md Icon--square Icon--loading">
                <svg viewBox="0 0 16.896 16.896" xmlns="http://www.w3.org/2000/svg" focusable="false">
                    <circle cx="8.448" cy="8.448" r="7.04" stroke="white" stroke-width="1.408" fill="none"></circle>
                </svg>
            </div>
        `;

        // Simulate a delay before showing the success state
        setTimeout(() => {
            handleButtonSuccessState();
        }, 3000);
    }

    function handleButtonSuccessState() {
        // console.warn('Payment successful');
        const buttonText = payButton.querySelector('span');
        const iconContainer = payButton.querySelector('.SubmitButton-IconContainer');

        // Change the button's background to green
        payButton.classList.add('SubmitButton--success');

        // Hide the text
        buttonText.style.display = 'none';

        // Replace the loading spinner with a checkmark icon
        iconContainer.innerHTML = `
            <div class="SubmitButton-CheckmarkIcon">
                <svg viewBox="0 0 28.8 28.8" xmlns="http://www.w3.org/2000/svg" focusable="false">
                    <circle cx="14.4" cy="14.4" r="12" stroke="white" stroke-width="2.4" fill="none"/>
                    <path class="checkmark" d="M 7.2 14.4 L 12 19.2 L 21.6 9.6" fill="transparent" stroke-width="2.4" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        `;
    }

    function showErrorMessage(inputId, message) {
        // console.warn('Showing error message for', inputId, ':', message);
        const errorMessageDiv = document.getElementById(`${inputId}-error`);
        if (errorMessageDiv) {
            errorMessageDiv.textContent = message;
            // errorMessageDiv.style.display = 'block';
            $(`#${inputId}-error`).slideDown()
        } else {
            console.error('Error message div not found for', inputId);
        }
    }

    function hideErrorMessage(inputId) {
        // console.warn('Hiding error message for', inputId);
        const errorMessageDiv = document.getElementById(`${inputId}-error`);
        if (errorMessageDiv) {
            $(`#${inputId}-error`).slideUp()
        } else {
            console.error('Error message div not found for', inputId);
        }
    }

    function isFormValid(check = false) {
        const isCardValid = validateCardNumber();
        const isCVVValid = validateCVV(check);
        const isExpirationValid = validateExpiryInput();

        // console.warn('Form validation:', { isCardValid, isCVVValid, isExpirationValid });

        // All fields must be valid and non-empty
        return isCardValid && isCVVValid && isExpirationValid &&
               cardNumberInput.value.trim() !== '' &&
               cvvInput.value.trim() !== '' &&
               expirationInput.value.trim() !== '';
    }

    function updatePayButtonState(check = false) {
        const isValid = isFormValid(check);

        // console.warn('Updating pay button state, form is valid:', isValid);

        // Disable the pay button if the form is not valid
        payButton.disabled = !isValid;

        // Ensure lockIcon is defined before accessing its style property
        if (lockIcon) {
            lockIcon.style.display = isValid ? 'block' : 'none';
        }

        if (isValid) {
            payButton.classList.remove('SubmitButton--disabled');
        } else {
            payButton.classList.add('SubmitButton--disabled');
        }
    }

    // Event Listeners    
    cardNumberInput.addEventListener('input', handleCardNumberInput);
    cardNumberInput.addEventListener('paste', handleCardNumberPaste);
    cardNumberInput.addEventListener('blur', function() {
        // console.warn('Card number blur event');
        updateCardNumberUI();
        if (cvvInput.value.trim() !== '') {
            validateCVV(true)
        }
        updatePayButtonState();
    });

    cardNumberInput.addEventListener('focus', handleFocus);

    cvvInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, ''); // Replace non-digits with an empty string

        if (e.inputType == 'deleteByCut' || !this.value) {
            // cvvInput.style.color = '';
            hideErrorMessage('card-cvc')
            cvvInput.classList.remove('error');
        }

        updatePayButtonState();

        if (previousValueCvv == this.value.trim()) {
            return
        } else {
            previousValueCvv = this.value
            hideErrorMessage('card-cvc')
            // cvvInput.style.color = '';
            validateCVV(false);
            cvvInput.classList.remove('error');
        }

        if (!/^\d*$/.test(e.data)) {
            validateCVV(false);
            // cvvInput.style.color = '';
            cvvInput.classList.remove('error');
            return
        }

        // cvvInput.style.color = '';
        hideErrorMessage('card-cvc')
        validateCVV(false);
        updatePayButtonState();
    });
    
    cvvInput.addEventListener('blur', function() {
        if (cvvInput.value) {
            validateCVV(true);  // Validate and show error on blur if necessary
        } else {
            validateCVV(false)
        }
        updatePayButtonState();
    });

    cvvInput.addEventListener('focus', handleFocus);

    expirationInput.addEventListener('input', handleExpiryInput);    
    expirationInput.addEventListener('focus', function() {
        this.dataset.previousValue = this.value.replace(/\D/g, '');
    });
    expirationInput.addEventListener('blur', handleExpiryBlur);
   
    form.addEventListener('submit', function(event) {
        // console.warn('Form submit event');
        event.preventDefault();
        updateCardNumberUI();
        validateCVV(true);
        if (isFormValid()) {
            handleButtonProcessingState();
        }
    });

    // Initialize
    // console.warn('Initializing form');
    startIconRotation();
    updatePayButtonState(); // Initial state update

    // console.warn('Form initialization complete');
});