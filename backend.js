// Backend API functions

// Function to load available data file timestamps from the backend
async function loadDataFiles() {
    try {
        const response = await fetch('/api/data-files');
        
        if (!response.ok) {
            throw new Error('Konnte Datensätze nicht laden');
        }
        
        const timestamps = await response.json();
        
        const dropdown = document.getElementById('dataFileDropdown');
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        if (timestamps.length === 0) {
            dropdown.innerHTML = '<option value="">No valid file pairs found</option>';
            return;
        }
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Datensatz wählen...';
        dropdown.appendChild(defaultOption);
        
        // Add timestamp options with formatted display
        timestamps.forEach(timestamp => {
            const option = document.createElement('option');
            option.value = timestamp; // Keep original timestamp as value
            option.textContent = formatTimestamp(timestamp); // Display formatted version
            dropdown.appendChild(option);
        });
        
        // Hide error message if it was shown
        document.getElementById('errorMessage').classList.add('display-none');
        
    } catch (error) {
        console.error('Fehler beim Laden der Datendateien:', error);
        
        const dropdown = document.getElementById('dataFileDropdown');
        dropdown.innerHTML = '<option value="">Error loading files</option>';
        
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = 'Konnte Datendateien nicht laden: ' + error.message;
        errorDiv.classList.remove('display-none');
        errorDiv.classList.add('display-block');
    }
}

// Function to load the complete dataset (data + metamodel) from backend
async function loadDataset(timestamp) {
    try {
        console.log(`Lade Datensatz: ${timestamp}`);
        
        const response = await fetch(`/api/dataset/${timestamp}`);
        if (!response.ok) {
            throw new Error(`Konnte Datensatz nicht laden: ${response.status}`);
        }
        
        currentDataset = await response.json();
        console.log('Datensatz erfolgreich geladen');
        
        // Store all query results for cross-entity navigation
        if (currentDataset.data && Array.isArray(currentDataset.data)) {
            allLoadedData = currentDataset.data;
        }
        
        // Now populate the queries dropdown
        populateQueriesDropdown();
        
    } catch (error) {
        console.error('Fehler beim Laden des Datensatzes:', error);
        
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = 'Error loading dataset: ' + error.message;
        errorDiv.classList.remove('display-none');
        errorDiv.classList.add('display-block');
        
        // Hide query dropdown on error
        document.getElementById('queryDropdownContainer').classList.add('display-none');
    }
}

// Function to load available timestamps from backend on page load
async function loadAvailableTimestamps() {
    try {
        const response = await fetch('/api/data-files');
        if (!response.ok) {
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }
        const timestamps = await response.json();
        
        const timestampSelect = document.getElementById('dataFileDropdown');
        if (timestampSelect) {
            // Clear existing options
            timestampSelect.innerHTML = '<option value="">Datensatz auswählen...</option>';
            
            // Add timestamp options
            timestamps.forEach(timestamp => {
                const option = document.createElement('option');
                option.value = timestamp;
                option.textContent = formatTimestamp(timestamp);
                timestampSelect.appendChild(option);
            });
            
            // Add change event listener
            timestampSelect.addEventListener('change', function() {
                if (this.value) {
                    handleTimestampSelection(this.value);
                } else {
                    // Reset everything when no timestamp is selected
                    resetAllViews();
                }
            });
        }
    } catch (error) {
        console.error('Fehler beim Laden der vorhandenen Datensätze:', error);
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = 'Fehler beim Laden der vorhandenen Datensätze: ' + error.message;
        errorDiv.classList.remove('display-none');
        errorDiv.classList.add('display-block');
    }
}

// Function to reset all views and selections
function resetAllViews() {
    // Reset current data
    currentTimestamp = null;
    currentDataset = null;
    allLoadedData = [];
    
    // Hide and reset query dropdown
    const queryDropdownContainer = document.getElementById('queryDropdownContainer');
    queryDropdownContainer.classList.remove('display-block');
    queryDropdownContainer.classList.add('display-none');
    
    const queryDropdown = document.getElementById('queryDropdown');
    queryDropdown.innerHTML = '<option value="">Select a query...</option>';
    
    // Hide selected query info
    const selectedQueryInfo = document.getElementById('selectedQueryInfo');
    selectedQueryInfo.classList.remove('display-block');
    selectedQueryInfo.classList.add('display-none');
    
    // Hide data display
    const dataDisplay = document.getElementById('dataDisplay');
    dataDisplay.classList.remove('display-block');
    dataDisplay.classList.add('display-none');
    
    // Hide details view
    const detailsView = document.getElementById('detailsView');
    detailsView.classList.remove('display-block');
    detailsView.classList.add('display-none');
    
    // Clear selected info
    document.getElementById('selectedTimestamp').textContent = '';
    document.getElementById('dataFileName').textContent = '';
    document.getElementById('metadataFileName').textContent = '';
    document.getElementById('selectedQuery').textContent = '';
    
    // Clear data content
    const dataContent = document.getElementById('dataContent');
    if (dataContent) {
        dataContent.innerHTML = '';
    }
    
    // Clear details content
    const detailsContent = document.getElementById('detailsContent');
    if (detailsContent) {
        detailsContent.innerHTML = '';
    }
    
    // Reset global table state variables if they exist
    if (typeof currentTableData !== 'undefined') {
        currentTableData = [];
    }
    if (typeof currentColumns !== 'undefined') {
        currentColumns = [];
    }
    if (typeof sortState !== 'undefined') {
        sortState = {};
    }
    if (typeof filterState !== 'undefined') {
        filterState = {};
    }
    if (typeof tempFilterState !== 'undefined') {
        tempFilterState = {};
    }
    if (typeof uniqueValues !== 'undefined') {
        uniqueValues = {};
    }
    if (typeof filteredValues !== 'undefined') {
        filteredValues = {};
    }
}

// Function to handle timestamp selection
async function handleTimestampSelection(timestamp) {
    // First reset all views to clean state
    resetAllViews();
    
    // Set current timestamp
    currentTimestamp = timestamp;
    
    // Update selected info display
    updateSelectedInfo(timestamp);
    
    // Load the complete dataset
    await loadDataset(timestamp);
}

// Function to update the selected info display
function updateSelectedInfo(timestamp) {
    document.getElementById('selectedTimestamp').textContent = formatTimestamp(timestamp);
    document.getElementById('dataFileName').textContent = `${timestamp}_data.json`;
    document.getElementById('metadataFileName').textContent = `${timestamp}_metamodel.json`;
}

// Function to handle download API call
async function downloadData(username, password) {
    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP Fehler! Status: ${response.status}`);
        }
        
        return result;
    } catch (error) {
        console.error('Download API Fehler:', error);
        throw error;
    }
}

// Initialize backend connections when page loads
function initializeBackend() {
    // Load available timestamps from backend on page load
    loadAvailableTimestamps();
}

// Call initialization immediately if DOM is already loaded, otherwise wait
if (document.readyState === 'laden...') {
    document.addEventListener('DOMContentLoaded', initializeBackend);
} else {
    initializeBackend();
}