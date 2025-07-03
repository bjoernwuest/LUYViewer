let currentTableData = []; // Store current table data for sorting
let currentColumns = []; // Store current column order
let sortState = {}; // Store sorting state for each column
let filterState = {}; // Store filter state for each column
let tempFilterState = {}; // Store temporary filter state while editing
let uniqueValues = {}; // Store unique values for each column
let filteredValues = {}; // Store filtered values for each column based on search

// Function to extract unique values from column data
function extractUniqueValues(data, columns) {
    const values = {};

    columns.forEach(column => {
        const valueSet = new Set();
        data.forEach(row => {
            const value = row[column];
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    // Add empty array as a special case
                    valueSet.add('(empty)');
                } else {
                    value.forEach(v => {
                        // Handle boolean values properly
                        if (v === false || v === true) {
                            valueSet.add(String(v));
                        } else {
                            valueSet.add(String(v || ''));
                        }
                    });
                }
            } else if (value === null || value === undefined || value === '') {
                // Add null, undefined, or empty string as empty
                valueSet.add('(empty)');
            } else if (value === false || value === true) {
                // Handle boolean values properly
                valueSet.add(String(value));
            } else {
                valueSet.add(String(value));
            }
        });
        values[column] = Array.from(valueSet).sort((a, b) => {
            // Sort so that '(empty)' appears first, then 'false', then 'true', then others
            if (a === '(empty)' && b !== '(empty)') return -1;
            if (a !== '(empty)' && b === '(empty)') return 1;
            if (a === 'false' && b === 'true') return -1;
            if (a === 'true' && b === 'false') return 1;
            return a.localeCompare(b);
        });
    });

    return values;
}

// Function to match text with wildcard support
function matchesWildcard(text, pattern) {
    if (!pattern) return true;
    
    // Escape special regex characters except * and ?
    const escapedPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')  // * becomes .*
        .replace(/\?/g, '.');  // ? becomes .
    
    const regex = new RegExp(escapedPattern, 'i'); // Case insensitive
    return regex.test(text);
}

// Function to filter values based on search text
function filterValuesBySearch(values, searchText) {
    if (!searchText) return values;
    
    return values.filter(value => matchesWildcard(value, searchText));
}

// Function to apply filters to data
function applyFilters(data) {
    return data.filter(row => {
        return currentColumns.every(column => {
            const filters = filterState[column];
            if (!filters || Object.keys(filters).length === 0) {
                return true; // No filters applied
            }

            const value = row[column];
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    // Handle empty arrays
                    const emptyFilter = filters['(empty)'];
                    return !emptyFilter || emptyFilter === 'include' || emptyFilter === 'dont-care';
                } else {
                    // For multi-value cells, exclusion takes precedence
                    const hasExcluded = value.some(v => {
                        const stringValue = (v === false || v === true) ? String(v) : String(v || '');
                        return filters[stringValue] === 'exclude';
                    });
                    if (hasExcluded) return false;

                    const hasIncluded = value.some(v => {
                        const stringValue = (v === false || v === true) ? String(v) : String(v || '');
                        return filters[stringValue] === 'include';
                    });
                    const hasOnlyDontCare = value.every(v => {
                        const stringValue = (v === false || v === true) ? String(v) : String(v || '');
                        return !filters.hasOwnProperty(stringValue) ||
                            filters[stringValue] === 'dont-care';
                    });

                    return hasIncluded || hasOnlyDontCare;
                }
            } else if (value === null || value === undefined || value === '') {
                // Handle null, undefined, or empty string values
                const emptyFilter = filters['(empty)'];
                return !emptyFilter || emptyFilter === 'include' || emptyFilter === 'dont-care';
            } else {
                const stringValue = (value === false || value === true) ? String(value) : String(value);
                const filterValue = filters[stringValue];
                return !filterValue || filterValue === 'include' || filterValue === 'dont-care';
            }
        });
    });
}

// Function to apply filters from temp state
function applyFiltersFromTempState(column) {
    // Copy temp state to actual filter state
    filterState[column] = { ...tempFilterState[column] };

    // Update table and filter button
    updateTable();
}

// Function to create filter dropdown
function createFilterDropdown(column, headerElement) {
    const dropdown = document.createElement('div');
    dropdown.className = 'filter-dropdown';
    
    // Check if this is a sticky column and adjust positioning
    if (headerElement.classList.contains('sticky-column')) {
        dropdown.classList.add('sticky-column-dropdown');
        // For sticky columns, append to body instead of header
        document.body.appendChild(dropdown);
    }

    // Header
    const header = document.createElement('div');
    header.className = 'filter-header';
    header.textContent = `Filter: ${column}`;
    dropdown.appendChild(header);

    // Search field
    const searchSection = document.createElement('div');
    searchSection.className = 'filter-search';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search... (* = any chars, ? = single char)';
    searchInput.className = 'filter-search-input';
    
    // Add search functionality
    searchInput.addEventListener('input', (e) => {
        e.stopPropagation();
        const searchText = e.target.value;
        filteredValues[column] = filterValuesBySearch(uniqueValues[column], searchText);
        updateFilterDropdown(column, dropdown);
    });
    
    // Prevent dropdown from closing when typing in search
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    searchSection.appendChild(searchInput);
    dropdown.appendChild(searchSection);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'filter-controls';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = 'All';
    selectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const valuesToProcess = filteredValues[column] || uniqueValues[column];
        valuesToProcess.forEach(value => {
            if (!tempFilterState[column]) tempFilterState[column] = {};
            tempFilterState[column][value] = 'include';
        });
        updateFilterDropdown(column, dropdown);
    });

    const selectNoneBtn = document.createElement('button');
    selectNoneBtn.textContent = 'None';
    selectNoneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const valuesToProcess = filteredValues[column] || uniqueValues[column];
        valuesToProcess.forEach(value => {
            if (!tempFilterState[column]) tempFilterState[column] = {};
            tempFilterState[column][value] = 'exclude';
        });
        updateFilterDropdown(column, dropdown);
    });

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tempFilterState[column] = {};
        updateFilterDropdown(column, dropdown);
    });

    const dontCareBtn = document.createElement('button');
    dontCareBtn.textContent = "Don't Care";
    dontCareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const valuesToProcess = filteredValues[column] || uniqueValues[column];
        valuesToProcess.forEach(value => {
            if (!tempFilterState[column]) tempFilterState[column] = {};
            tempFilterState[column][value] = 'dont-care';
        });
        updateFilterDropdown(column, dropdown);
    });

    controls.appendChild(selectAllBtn);
    controls.appendChild(selectNoneBtn);
    controls.appendChild(clearBtn);
    controls.appendChild(dontCareBtn);
    dropdown.appendChild(controls);

    // Filter items container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'filter-items-container';
    dropdown.appendChild(itemsContainer);

    // Apply buttons
    const applySection = document.createElement('div');
    applySection.className = 'filter-apply';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Reset temp state to current filter state
        tempFilterState[column] = { ...filterState[column] };
        dropdown.classList.remove('show');
    });

    const applyBtn = document.createElement('button');
    applyBtn.className = 'primary';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        applyFiltersFromTempState(column);
        dropdown.classList.remove('show');
    });

    applySection.appendChild(cancelBtn);
    applySection.appendChild(applyBtn);
    dropdown.appendChild(applySection);

    // Initialize filtered values
    filteredValues[column] = uniqueValues[column];

    // Initial population
    updateFilterDropdown(column, dropdown);

    return dropdown;
}

// Function to update filter dropdown content
function updateFilterDropdown(column, dropdown) {
    const itemsContainer = dropdown.querySelector('.filter-items-container');
    itemsContainer.innerHTML = '';

    const valuesToShow = filteredValues[column] || uniqueValues[column];

    valuesToShow.forEach(value => {
        const item = document.createElement('div');
        item.className = 'filter-item';

        const currentState = tempFilterState[column]?.[value] || 'include';
        item.classList.add(currentState);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = currentState === 'include';

        const text = document.createElement('span');
        text.className = 'filter-item-text';
        text.textContent = value || '(empty)';

        const indicator = document.createElement('span');
        indicator.className = 'filter-state-indicator';
        indicator.textContent = currentState === 'include' ? '✓' :
            currentState === 'exclude' ? '✗' : '○';

        // Click handler for cycling through states
        const cycleState = (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent default checkbox behavior
            if (!tempFilterState[column]) tempFilterState[column] = {};
            const current = tempFilterState[column][value] || 'include';

            // Cycle: include -> exclude -> dont-care -> include
            if (current === 'include') {
                tempFilterState[column][value] = 'exclude';
            } else if (current === 'exclude') {
                tempFilterState[column][value] = 'dont-care';
            } else {
                tempFilterState[column][value] = 'include';
            }

            updateFilterDropdown(column, dropdown);
        };

        // Use click event instead of change for checkbox to have better control
        checkbox.addEventListener('click', cycleState);
        text.addEventListener('click', cycleState);

        // Prevent the item container from closing the dropdown when clicked
        item.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        item.appendChild(checkbox);
        item.appendChild(text);
        item.appendChild(indicator);
        itemsContainer.appendChild(item);
    });
}

// Function to update filter button state
function updateFilterButtonState(column, headerElement) {
    const filterButton = headerElement.querySelector('.filter-button');
    const hasFilters = filterState[column] && Object.keys(filterState[column]).length > 0;

    if (hasFilters) {
        filterButton.classList.add('active');
    } else {
        filterButton.classList.remove('active');
    }
}

// Function to update table with current filters
function updateTable() {
    const filteredData = applyFilters(currentTableData);
    renderTable(filteredData, currentColumns);
}

// Function to sort table by column
function sortTable(columnKey) {
    // Initialize sort state for column if not exists
    if (!sortState[columnKey]) {
        sortState[columnKey] = 'none';
    }

    // Cycle through sort states: none -> asc -> desc -> none
    switch (sortState[columnKey]) {
        case 'none':
            sortState[columnKey] = 'asc';
            break;
        case 'asc':
            sortState[columnKey] = 'desc';
            break;
        case 'desc':
            sortState[columnKey] = 'none';
            break;
    }

    // Reset other columns to none
    Object.keys(sortState).forEach(key => {
        if (key !== columnKey) {
            sortState[key] = 'none';
        }
    });

    // Sort the data
    let sortedData;
    if (sortState[columnKey] === 'none') {
        // Restore original order: by 'name' column if present, otherwise by 'id' column
        sortedData = [...currentTableData].sort((a, b) => {
            let sortValue1, sortValue2;

            if (a.hasOwnProperty('name') && b.hasOwnProperty('name')) {
                sortValue1 = a.name;
                sortValue2 = b.name;
            } else if (a.hasOwnProperty('id') && b.hasOwnProperty('id')) {
                sortValue1 = a.id;
                sortValue2 = b.id;
            } else {
                return 0;
            }

            // Handle array values
            if (Array.isArray(sortValue1)) sortValue1 = sortValue1.join(', ');
            if (Array.isArray(sortValue2)) sortValue2 = sortValue2.join(', ');

            // Convert to string for comparison
            const str1 = String(sortValue1 || '').toLowerCase();
            const str2 = String(sortValue2 || '').toLowerCase();

            return str1.localeCompare(str2);
        });
    } else {
        sortedData = [...currentTableData].sort((a, b) => {
            let value1 = a[columnKey];
            let value2 = b[columnKey];

            // Handle array values
            if (Array.isArray(value1)) value1 = value1.join(', ');
            if (Array.isArray(value2)) value2 = value2.join(', ');

            // Convert to string for comparison
            const str1 = String(value1 || '').toLowerCase();
            const str2 = String(value2 || '').toLowerCase();

            const comparison = str1.localeCompare(str2);
            return sortState[columnKey] === 'asc' ? comparison : -comparison;
        });
    }

    // Update current table data and re-render with filters
    currentTableData = sortedData;
    updateTable();
}

// Add this helper function before the renderTable function
function calculateStickyDropdownPosition(column, filterButton, presentStickyColumns) {
    const rect = filterButton.getBoundingClientRect();
    const dropdownWidth = 280;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 400;
    
    let leftPosition = rect.left;
    let topPosition = rect.bottom + 2;
    
    // Special positioning logic for sticky columns
    if (presentStickyColumns.includes(column)) {
        // Find the rightmost sticky column
        const rightmostStickyColumn = presentStickyColumns[presentStickyColumns.length - 1];
        const rightmostHeader = document.querySelector(`th[data-column="${rightmostStickyColumn}"]`);
        
        if (rightmostHeader) {
            const rightmostRect = rightmostHeader.getBoundingClientRect();
            
            // Position all sticky column dropdowns to the right of all sticky columns
            leftPosition = rightmostRect.right + 10;
            
            // For the "id" column (first sticky), add some extra offset if needed
            if (column === 'id') {
                leftPosition = rightmostRect.right + 15;
            }
            
            // For the "name" column, ensure it's clearly separated
            if (column === 'name') {
                leftPosition = rightmostRect.right + 20;
            }
        }
    }
    
    // Boundary checking - horizontal
    if (leftPosition + dropdownWidth > viewportWidth) {
        // If dropdown would go off-screen to the right, position it from the right edge
        leftPosition = viewportWidth - dropdownWidth - 10;
    }
    
    // Ensure minimum left position (don't go off the left edge)
    if (leftPosition < 10) {
        leftPosition = 10;
    }
    
    // Boundary checking - vertical
    if (topPosition + dropdownHeight > viewportHeight) {
        // Position above the button if there's not enough space below
        topPosition = rect.top - dropdownHeight - 2;
        
        // If that would go off the top, position at the top of the viewport
        if (topPosition < 10) {
            topPosition = 10;
        }
    }
    
    return { left: leftPosition, top: topPosition };
}

function renderTable(data, columns) {
    const dataContent = document.getElementById('dataContent');

    // Clean up any existing sticky column dropdowns from previous renders
    document.querySelectorAll('.sticky-column-dropdown').forEach(dropdown => {
        if (dropdown.parentNode === document.body) {
            document.body.removeChild(dropdown);
        }
    });

    // Create scrollable container for the table
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-wrapper';

    // Create table
    const table = document.createElement('table');
    table.className = 'data-table';

    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Identify sticky columns and their order
    const stickyColumns = ['id', 'name'];
    const presentStickyColumns = stickyColumns.filter(col => columns.includes(col));
    let stickyLeftOffset = 0;

    // Add headers with sorting and filtering functionality
    columns.forEach((key, index) => {
        const th = document.createElement('th');
        th.className = 'sortable-header';
        th.style.position = 'relative';
        th.textContent = key;
        th.setAttribute('data-column', key); // Add data attribute for easier identification

        // Check if this column should be sticky
        const stickyIndex = presentStickyColumns.indexOf(key);
        if (stickyIndex !== -1) {
            th.classList.add('sticky-column');
            th.style.position = 'sticky';
            th.style.left = stickyLeftOffset + 'px';
            th.style.zIndex = '150'; // Higher than regular sticky header
            th.style.backgroundColor = '#f8f9fa'; // Ensure background covers content
            th.setAttribute('data-sticky-offset', stickyLeftOffset);
            
            // Calculate offset for next sticky column (approximate width)
            stickyLeftOffset += 120; // Adjust this value based on your typical column width
        }

        // Add sort indicator
        const sortIndicator = document.createElement('span');
        sortIndicator.className = `sort-indicator ${sortState[key] || 'none'}`;
        th.appendChild(sortIndicator);

        // Add filter button
        const filterButton = document.createElement('span');
        filterButton.className = 'filter-button';
        th.appendChild(filterButton);

        // Add filter dropdown
        const filterDropdown = createFilterDropdown(key, th);
        th.appendChild(filterDropdown);

        // Update filter button state
        updateFilterButtonState(key, th);

        // Add click event for sorting (but not on filter button or dropdown)
        th.addEventListener('click', (e) => {
            if (!e.target.classList.contains('filter-button') && 
                !e.target.closest('.filter-dropdown')) {
                sortTable(key);
            }
        });

        // Update the filter button click event in the renderTable function
        filterButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            console.log(`Filter button clicked for column: ${key}`); // Debug log

            // Initialize temp state from current filter state
            tempFilterState[key] = { ...filterState[key] };

            // Reset filtered values to show all values when dropdown opens
            filteredValues[key] = uniqueValues[key];

            // Clear search input when dropdown opens
            const searchInput = filterDropdown.querySelector('.filter-search-input');
            if (searchInput) {
                searchInput.value = '';
            }

            // Close other dropdowns
            document.querySelectorAll('.filter-dropdown.show').forEach(dropdown => {
                if (dropdown !== filterDropdown) {
                    dropdown.classList.remove('show');
                }
            });

            // For sticky columns, calculate proper positioning
            if (th.classList.contains('sticky-column')) {
                const position = calculateStickyDropdownPosition(key, filterButton, presentStickyColumns);
                
                // Position the dropdown relative to the viewport
                filterDropdown.style.position = 'fixed';
                filterDropdown.style.top = position.top + 'px';
                filterDropdown.style.left = position.left + 'px';
            }

            // Toggle current dropdown
            filterDropdown.classList.toggle('show');

            // Update dropdown content with current temp state
            if (filterDropdown.classList.contains('show')) {
                updateFilterDropdown(key, filterDropdown);
                // Focus on search input for better UX
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 100);
                }
            }
        });

        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');

    // Reset sticky offset for body cells
    stickyLeftOffset = 0;

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        let currentStickyOffset = 0;

        columns.forEach(key => {
            const td = document.createElement('td');
            const value = item[key];

            // Check if this column should be sticky
            const stickyIndex = presentStickyColumns.indexOf(key);
            if (stickyIndex !== -1) {
                td.classList.add('sticky-column');
                td.style.position = 'sticky';
                td.style.left = currentStickyOffset + 'px';
                td.style.zIndex = '100';
                td.style.backgroundColor = 'white'; // Ensure background covers content
                td.setAttribute('data-sticky-offset', currentStickyOffset);
                
                // Calculate offset for next sticky column
                currentStickyOffset += 120; // Should match the header offset
            }

            // Special handling for 'id' column - make it clickable to show details
            if (key === 'id') {
                const link = document.createElement('a');
                link.href = '#';
                link.className = 'id-link';

                if (Array.isArray(value)) {
                    link.textContent = value.length > 0 ? value.join(', ') : '';
                } else {
                    link.textContent = value || '';
                }

                // Attach click handler directly to the link
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showDetails(item, index);
                });

                td.appendChild(link);
            }
            // Special handling for 'name' column - make it clickable to open elementURI
            else if (key === 'name' && item.elementURI) {
                const link = document.createElement('a');
                link.href = item.elementURI;
                link.target = '_blank';
                link.className = 'id-link';

                if (Array.isArray(value)) {
                    link.textContent = value.length > 0 ? value.join(', ') : '';
                } else {
                    link.textContent = value || '';
                }

                // Prevent event bubbling for external links
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                });

                td.appendChild(link);
            }
            // Default handling for other columns
            else {
                // Use the new renderCellContent function
                const cellContent = renderCellContent(value, key);
                if (typeof cellContent === 'string') {
                    td.textContent = cellContent;
                } else {
                    td.appendChild(cellContent);
                }
            }

            row.appendChild(td);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);

    // Clear current table
    dataContent.innerHTML = '';

    // Add container to data content
    dataContent.appendChild(tableContainer);

    // After table is rendered, calculate and set actual sticky column widths
    setTimeout(() => {
        updateStickyColumnWidths(table, presentStickyColumns);
    }, 0);

    // Close any open dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-dropdown') && !e.target.classList.contains('filter-button')) {
            document.querySelectorAll('.filter-dropdown.show').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    }, { once: false });
}

// Helper function to calculate and set proper sticky column positions
function updateStickyColumnWidths(table, stickyColumns) {
    if (stickyColumns.length === 0) return;

    let cumulativeWidth = 0;
    
    stickyColumns.forEach((columnKey, index) => {
        // Find all cells (header and body) for this column
        const columnCells = table.querySelectorAll(`th[data-column="${columnKey}"], td`);
        const columnIndex = Array.from(table.querySelector('thead tr').children)
            .findIndex(th => th.getAttribute('data-column') === columnKey);
        
        if (columnIndex === -1) return;

        // Get the actual width of the first cell in this column
        const headerCell = table.querySelector(`th[data-column="${columnKey}"]`);
        if (headerCell) {
            const actualWidth = headerCell.offsetWidth;
            
            // Update all cells in this column with the correct left position
            const headerCells = table.querySelectorAll(`th[data-column="${columnKey}"]`);
            const bodyCells = table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`);
            
            [...headerCells, ...bodyCells].forEach(cell => {
                if (cell.classList.contains('sticky-column')) {
                    cell.style.left = cumulativeWidth + 'px';
                }
            });
            
            cumulativeWidth += actualWidth;
        }
    });
}

// Function to display query data in a table
function displayData(queryData) {
    const dataDisplay = document.getElementById('dataDisplay');
    const dataContent = document.getElementById('dataContent');

    if (!queryData.result || !Array.isArray(queryData.result) || queryData.result.length === 0) {
        dataContent.innerHTML = '<p>No results found for this query.</p>';
        dataDisplay.classList.remove('display-none');
        dataDisplay.classList.add('display-block');
        return;
    }

    // Reset sorting and filtering state for new data
    sortState = {};
    filterState = {};
    tempFilterState = {};
    filteredValues = {};

    // Sort the data: by 'name' column if present, otherwise by 'id' column
    const sortedData = [...queryData.result].sort((a, b) => {
        let sortValue1, sortValue2;

        if (a.hasOwnProperty('name') && b.hasOwnProperty('name')) {
            sortValue1 = a.name;
            sortValue2 = b.name;
        } else if (a.hasOwnProperty('id') && b.hasOwnProperty('id')) {
            sortValue1 = a.id;
            sortValue2 = b.id;
        } else {
            return 0; // No sorting if neither name nor id columns exist
        }

        // Handle array values
        if (Array.isArray(sortValue1)) sortValue1 = sortValue1.join(', ');
        if (Array.isArray(sortValue2)) sortValue2 = sortValue2.join(', ');

        // Convert to string for comparison
        const str1 = String(sortValue1 || '').toLowerCase();
        const str2 = String(sortValue2 || '').toLowerCase();

        return str1.localeCompare(str2);
    });

    // Store current data and columns for sorting
    currentTableData = sortedData;

    // Get all unique keys from all objects, but exclude specific columns
    const allKeys = new Set();
    sortedData.forEach(item => {
        Object.keys(item).forEach(key => {
            // Exclude elementURI, $$hierarchy_level$$, and position columns
            if (key !== 'elementURI' && key !== '$$hierarchy_level$$' && key !== 'position') {
                allKeys.add(key);
            }
        });
    });

    // Define the preferred order: id, name, description first, then others
    const orderedKeys = [];

    // Add priority fields first
    if (allKeys.has('id')) {
        orderedKeys.push('id');
        allKeys.delete('id');
    }
    if (allKeys.has('name')) {
        orderedKeys.push('name');
        allKeys.delete('name');
    }
    if (allKeys.has('description')) {
        orderedKeys.push('description');
        allKeys.delete('description');
    }

    // Add remaining fields
    orderedKeys.push(...Array.from(allKeys));

    // Store current columns
    currentColumns = orderedKeys;

    // Initialize sort state for all columns
    orderedKeys.forEach(key => {
        sortState[key] = 'none';
    });

    // Extract unique values for filters
    uniqueValues = extractUniqueValues(sortedData, orderedKeys);

    // Render the table
    renderTable(sortedData, orderedKeys);

    // Show data display
    dataDisplay.classList.remove('display-none');
    dataDisplay.classList.add('display-block');
}

// Function to render cell content based on value type
function renderCellContent(value, column) {
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return 'No entries';
        } else if (value.length === 1) {
            // Single item - handle objects specially
            const item = value[0];
            if (typeof item === 'object' && item !== null && item.id) {
                // This is a JSON object with id (like parent/children)
                const displayText = item.name || item.id;
                const link = document.createElement('a');
                link.href = '#';
                link.className = 'id-link';
                link.textContent = displayText;
                link.onclick = (e) => {
                    e.preventDefault();
                    navigateToEntity(item.id, item.elementURI);
                };
                return link;
            } else {
                return String(item);
            }
        } else {
            // Multiple items
            const container = document.createElement('div');
            value.forEach((item, index) => {
                if (typeof item === 'object' && item !== null && item.id) {
                    // This is a JSON object with id
                    const displayText = item.name || item.id;
                    const link = document.createElement('a');
                    link.href = '#';
                    link.className = 'id-link';
                    link.textContent = displayText;
                    link.onclick = (e) => {
                        e.preventDefault();
                        navigateToEntity(item.id, item.elementURI);
                    };
                    container.appendChild(link);
                } else {
                    const span = document.createElement('span');
                    span.textContent = String(item);
                    container.appendChild(span);
                }

                // Add separator between items (except for last item)
                if (index < value.length - 1) {
                    const separator = document.createElement('span');
                    separator.textContent = ', ';
                    separator.className = 'array-separator';
                    container.appendChild(separator);
                }
            });
            return container;
        }
    } else if (typeof value === 'object' && value !== null) {
        if (value.id) {
            // Single JSON object with id
            const displayText = value.name || value.id;
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'id-link';
            link.textContent = displayText;
            link.onclick = (e) => {
                e.preventDefault();
                navigateToEntity(value.id, value.elementURI);
            };
            return link;
        } else {
            return JSON.stringify(value);
        }
    } else {
        return String(value || '');
    }
}