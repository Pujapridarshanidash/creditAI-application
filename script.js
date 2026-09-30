// API Configuration
const API_BASE_URL = 'http://localhost:8000'; // Change this to your deployed Render URL

// DOM Elements
const loanForm = document.getElementById('loanForm');
const resultContainer = document.getElementById('resultContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');

// Form submission handler
loanForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hide previous results and errors
    resultContainer.style.display = 'none';
    errorMessage.style.display = 'none';
    
    // Show loading spinner
    loadingSpinner.style.display = 'flex';
    
    try {
        // Collect form data
        const formData = new FormData(loanForm);
        const data = {
            person_age: parseInt(formData.get('person_age')),
            person_income: parseFloat(formData.get('person_income')),
            person_home_ownership: formData.get('person_home_ownership'),
            person_emp_length: formData.get('person_emp_length'),
            loan_intent: formData.get('loan_intent'),
            loan_grade: formData.get('loan_grade'),
            loan_amnt: parseFloat(formData.get('loan_amnt')),
            loan_int_rate: parseFloat(formData.get('loan_int_rate')),
            loan_percent_income: parseFloat(formData.get('loan_percent_income')),
            cb_person_default_on_file: formData.get('cb_person_default_on_file'),
            cb_person_cred_hist_length: parseFloat(formData.get('cb_person_cred_hist_length'))
        };

        // Validate data
        if (!validateFormData(data)) {
            throw new Error('Please fill in all fields correctly');
        }

        // Make API request
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Hide loading spinner
        loadingSpinner.style.display = 'none';
        
        // Display results
        displayResults(result);
        
    } catch (error) {
        console.error('Error:', error);
        loadingSpinner.style.display = 'none';
        showError(error.message || 'An error occurred while processing your request. Please check the API connection.');
    }
});

// Validate form data
function validateFormData(data) {
    const requiredFields = [
        'person_age',
        'person_income',
        'person_home_ownership',
        'person_emp_length',
        'loan_intent',
        'loan_grade',
        'loan_amnt',
        'loan_int_rate',
        'loan_percent_income',
        'cb_person_default_on_file',
        'cb_person_cred_hist_length'
    ];

    for (let field of requiredFields) {
        if (data[field] === null || data[field] === undefined || data[field] === '') {
            return false;
        }
    }

    // Additional validation
    if (data.person_age < 18 || data.person_age > 120) {
        return false;
    }

    if (data.person_income < 0 || data.loan_amnt < 0) {
        return false;
    }

    return true;
}

// Display results
function displayResults(result) {
    // Extract result data
    const predictionProba = (result.prediction_proba * 100).toFixed(2);
    const prediction = result.prediction;
    const threshold = (result.threshold * 100).toFixed(2);
    const riskStatus = result.Result;

    // Update risk circle with animation
    const riskValue = document.getElementById('riskValue');
    const riskBarFill = document.getElementById('riskBarFill');
    const resultStatus = document.getElementById('resultStatus');

    // Animate risk percentage
    animateValue(riskValue, 0, parseFloat(predictionProba), 1000, '%');
    
    // Animate risk bar
    const fillPercentage = Math.min(parseFloat(predictionProba), 100);
    riskBarFill.style.width = fillPercentage + '%';

    // Update result status with color
    resultStatus.textContent = riskStatus;
    resultStatus.classList.remove('high-risk', 'low-risk');
    if (prediction === 1) {
        resultStatus.classList.add('high-risk');
    } else {
        resultStatus.classList.add('low-risk');
    }

    // Update all result details
    document.getElementById('resultProba').textContent = predictionProba + '%';
    document.getElementById('resultThreshold').textContent = threshold + '%';
    document.getElementById('resultPrediction').textContent = prediction === 1 ? 'High Risk' : 'Low Risk';

    // Apply dynamic color to risk circle based on prediction
    const riskCircle = document.querySelector('.risk-circle');
    if (prediction === 1) {
        riskCircle.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    } else {
        riskCircle.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    }

    // Show result container with animation
    resultContainer.style.display = 'block';
    
    // Scroll to results
    setTimeout(() => {
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Animate counter
function animateValue(element, start, end, duration, suffix = '') {
    let current = start;
    const range = end - start;
    const increment = range / (duration / 16);
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = current.toFixed(2) + suffix;
    }, 16);
}

// Show error message
function showError(message) {
    errorMessage.textContent = '❌ ' + message;
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Reset form
function resetForm() {
    loanForm.reset();
    resultContainer.style.display = 'none';
    errorMessage.style.display = 'none';
    loadingSpinner.style.display = 'none';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Form input animations
const inputs = document.querySelectorAll('.form-group input, .form-group select');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
        if (!this.value) {
            this.parentElement.classList.remove('focused');
        }
    });
    
    // Add filled class if input has value on page load
    if (input.value) {
        input.parentElement.classList.add('focused');
    }
});

// Disable submit button while loading
loanForm.addEventListener('submit', function() {
    const submitBtn = this.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    // Re-enable after 5 seconds (in case of error)
    setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="button-text">Assess Credit Risk</span><span class="button-icon">→</span>';
    }, 5000);
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter to submit
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        const focusedElement = document.activeElement;
        if (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'SELECT') {
            loanForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to close results
    if (event.key === 'Escape' && resultContainer.style.display !== 'none') {
        resetForm();
    }
});

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Improve button feedback
const submitBtn = document.querySelector('.submit-btn');
submitBtn.addEventListener('mousedown', function() {
    this.style.transform = 'translateY(-1px)';
});

submitBtn.addEventListener('mouseup', function() {
    this.style.transform = '';
});

// Initialize tooltips for form fields (optional)
const tooltips = {
    'person_age': 'Your current age in years',
    'person_income': 'Your annual income before taxes',
    'person_home_ownership': 'Your current housing situation',
    'person_emp_length': 'Years employed at your current job',
    'loan_intent': 'Primary purpose of the loan',
    'loan_grade': 'Internal grade assigned to this loan',
    'loan_amnt': 'Total amount you want to borrow',
    'loan_int_rate': 'Annual interest rate percentage',
    'loan_percent_income': 'Loan amount as percentage of your income',
    'cb_person_default_on_file': 'Any previous loan defaults',
    'cb_person_cred_hist_length': 'Years of credit history'
};

// Add placeholder hints
Object.keys(tooltips).forEach(key => {
    const element = document.querySelector(`[name="${key}"]`);
    if (element && element.tagName === 'INPUT') {
        element.title = tooltips[key];
    }
});

// Check API connection on load
window.addEventListener('load', function() {
    checkAPIConnection();
});

// Check API connection
async function checkAPIConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (response.ok) {
            console.log('✓ API connection established');
        } else {
            showConnectionWarning();
        }
    } catch (error) {
        console.warn('API not reachable. Make sure the FastAPI server is running.');
        showConnectionWarning();
    }
}

function showConnectionWarning() {
    const warning = document.createElement('div');
    warning.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 152, 0, 0.9);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    warning.innerHTML = '⚠️ API not connected. Check your backend server.';
    document.body.appendChild(warning);
    
    setTimeout(() => {
        warning.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => warning.remove(), 300);
    }, 5000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .form-group.focused label {
        color: #667eea;
        font-weight: 600;
    }
`;
document.head.appendChild(style);