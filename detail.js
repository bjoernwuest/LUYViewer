// Function to show detailed view of an item
function showDetails(item, index) {
    const detailsView = document.getElementById('detailsView');
    const detailsTitle = document.getElementById('detailsTitle');
    const detailsContent = document.getElementById('detailsContent');

    // Extract the name from the item (handle both array and string format)
    let itemName = null;
    if (item.name) {
        if (Array.isArray(item.name)) {
            itemName = item.name.length > 0 ? item.name[0] : null;
        } else {
            itemName = item.name;
        }
    }

    // If no name available, fallback to ID
    if (!itemName) {
        let itemId = null;
        if (item.id) {
            if (Array.isArray(item.id)) {
                itemId = item.id.length > 0 ? item.id[0] : null;
            } else {
                itemId = item.id;
            }
        }
        itemName = itemId ? `id ${itemId}` : 'Unknown Item';
    }

    // Set title using the item's name or ID
    detailsTitle.textContent = `Details for ${itemName}`;

    // Create details table
    const table = document.createElement('table');
    table.className = 'details-table';

    // Define the order for details view: id, name, description first, then others
    const orderedEntries = [];
    const remainingEntries = [];

    Object.entries(item).forEach(([key, value]) => {
        // Skip elementURI, $$hierarchy_level$$, and position fields
        if (key === 'elementURI' || key === '$$hierarchy_level$$' || key === 'position') {
            return;
        }

        if (key === 'id') {
            orderedEntries[0] = [key, value];
        } else if (key === 'name') {
            orderedEntries[1] = [key, value];
        } else if (key === 'description') {
            orderedEntries[2] = [key, value];
        } else {
            remainingEntries.push([key, value]);
        }
    });

    // Combine ordered entries with remaining entries
    const allEntries = orderedEntries.filter(entry => entry).concat(remainingEntries);

    allEntries.forEach(([key, value]) => {
        const row = document.createElement('tr');

        const keyCell = document.createElement('th');
        keyCell.textContent = key;

        const valueCell = document.createElement('td');

        // Special handling for 'id' and 'name' fields - make them links to elementURI
        if ((key === 'id' || key === 'name') && item.elementURI) {
            const link = document.createElement('a');
            link.href = item.elementURI;
            link.target = '_blank';
            link.className = 'id-link';

            if (Array.isArray(value)) {
                link.textContent = value.length > 0 ? value.join(', ') : 'No value';
            } else {
                link.textContent = value || 'No value';
            }

            valueCell.appendChild(link);
        }
        else if (Array.isArray(value)) {
            if (value.length === 0) {
                valueCell.textContent = 'No entries';
            } else {
                value.forEach(arrayItem => {
                    const div = document.createElement('div');
                    div.className = 'details-array-item';

                    if (typeof arrayItem === 'object' && arrayItem !== null) {
                        // Handle object arrays (like children, parent)
                        if (arrayItem.id && arrayItem.elementURI) {
                            // Create clickable link for cross-entity navigation
                            const link = document.createElement('a');
                            link.href = '#';
                            link.className = 'id-link';
                            link.textContent = `${arrayItem.name || arrayItem.id} (ID: ${arrayItem.id})`;
                            link.onclick = (e) => {
                                e.preventDefault();
                                navigateToEntity(arrayItem.id, arrayItem.elementURI);
                            };
                            div.appendChild(link);
                        } else {
                            div.textContent = JSON.stringify(arrayItem, null, 2);
                        }
                    } else {
                        div.textContent = arrayItem;
                    }

                    valueCell.appendChild(div);
                });
            }
        } else if (typeof value === 'object' && value !== null) {
            const objDiv = document.createElement('div');
            objDiv.className = 'details-object';
            objDiv.textContent = JSON.stringify(value, null, 2);
            valueCell.appendChild(objDiv);
        } else {
            valueCell.textContent = value || 'No value';
        }

        row.appendChild(keyCell);
        row.appendChild(valueCell);
        table.appendChild(row);
    });

    detailsContent.innerHTML = '';
    detailsContent.appendChild(table);

    // Hide data display and show details
    document.getElementById('dataDisplay').classList.add('display-none');
    document.getElementById('dataDisplay').classList.remove('display-block');
    detailsView.classList.remove('display-none');
    detailsView.classList.add('display-block');
}


// Function to navigate to a related entity
function navigateToEntity(entityId, elementURI) {
    // Search through all loaded data for the entity
    for (const queryData of allLoadedData) {
        if (queryData.result) {
            const foundEntity = queryData.result.find(item => {
                if (Array.isArray(item.id)) {
                    return item.id.includes(entityId);
                } else {
                    return item.id === entityId;
                }
            });

            if (foundEntity) {
                // Switch to the appropriate query first
                const queryDropdown = document.getElementById('queryDropdown');
                queryDropdown.value = queryData.query;

                // Display the query
                displayQuery(queryData.query);

                // Find the index and show details
                const entityIndex = queryData.result.findIndex(item => {
                    if (Array.isArray(item.id)) {
                        return item.id.includes(entityId);
                    } else {
                        return item.id === entityId;
                    }
                });

                if (entityIndex !== -1) {
                    setTimeout(() => {
                        showDetails(foundEntity, entityIndex);
                    }, 100);
                }

                return;
            }
        }
    }

    alert(`Entity with ID ${entityId} not found in loaded data.`);
}


// Function to go back to results table
function showResultsTable() {
    document.getElementById('detailsView').classList.add('display-none');
    document.getElementById('detailsView').classList.remove('display-block');
    document.getElementById('dataDisplay').classList.remove('display-none');
    document.getElementById('dataDisplay').classList.add('display-block');
}
