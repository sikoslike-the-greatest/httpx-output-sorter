(() => {
    const table = document.querySelector("table");
    if (!table) return alert("Table not found!");

    const tbody = table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    let sortState = { col: -1, dir: 1 };

    const headers = ["Host", "Title", "Status Code", "Technologies"];
    
    // Нормализация текста для сравнения
    function normalizeText(text) {
        return text.replace(/\s+/g, ' ').trim().toLowerCase();
    }

    const extractors = {
        "Host": row => {
            const element = row.querySelector("ul li:nth-child(1) a");
            return normalizeText(element?.textContent || "");
        },
        "Title": row => {
            const element = row.querySelector("ul li:nth-child(2) a");
            return normalizeText(element?.textContent || "");
        },
        "Status Code": row => {
            const element = row.querySelector("ul li:nth-child(3) a");
            return normalizeText(element?.textContent || "");
        },
        "Technologies": row => {
            const element = row.querySelector("ul li:nth-child(4) a");
            const text = element?.textContent || "";
            if (!text || text.trim() === '[]') return [];
            return text.replace(/[\[\]]/g, "").split(/\s+/).map(t => normalizeText(t)).filter(Boolean);
        }
    };

    // Храним оригинальные значения для отображения
    const displayValues = {
        "Host": new Map(),
        "Status Code": new Map(),
        "Technologies": new Map()
    };

    const filters = {
        "Host": new Set(),
        "Status Code": new Set(),
        "Technologies": new Set()
    };

    const selectedFilters = {
        "Host": new Set(),
        "Status Code": new Set(),
        "Technologies": new Set()
    };

    function initFilters() {
        // Сначала собираем все значения
        rows.forEach(row => {
            const host = extractors["Host"](row);
            const status = extractors["Status Code"](row);
            const techs = extractors["Technologies"](row);
            
            // Сохраняем оригинальные значения для отображения
            if (host) {
                const originalHost = row.querySelector("ul li:nth-child(1) a")?.textContent.trim() || "";
                displayValues["Host"].set(host, originalHost);
                filters["Host"].add(host);
            }
            
            if (status) {
                const originalStatus = row.querySelector("ul li:nth-child(3) a")?.textContent.trim() || "";
                displayValues["Status Code"].set(status, originalStatus);
                filters["Status Code"].add(status);
            }
            
            techs.forEach(t => {
                if (t) {
                    displayValues["Technologies"].set(t, t);
                    filters["Technologies"].add(t);
                }
            });
        });

        // Инициализируем выбранные фильтры
        Object.entries(filters).forEach(([key, values]) => {
            selectedFilters[key] = new Set(values);
        });
    }

    function applyFilters() {
        rows.forEach(row => {
            const host = extractors["Host"](row);
            const status = extractors["Status Code"](row);
            const techs = extractors["Technologies"](row);

            const hostMatch = selectedFilters["Host"].has(host);
            const statusMatch = selectedFilters["Status Code"].has(status);
            const techsMatch = techs.length === 0 || techs.some(t => selectedFilters["Technologies"].has(t));

            row.style.display = (hostMatch && statusMatch && techsMatch) ? "" : "none";
        });
    }

    function createCheckboxes(label, items, key) {
        const wrapper = document.createElement("div");
        wrapper.style.flex = "0 0 250px";
        wrapper.style.marginRight = "10px";
        wrapper.style.maxHeight = "180px";
        wrapper.style.overflowY = "auto";
        wrapper.style.fontSize = "12px";
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";

        const title = document.createElement("div");
        title.innerHTML = `<strong>${label}</strong>`;
        title.style.marginBottom = "4px";
        wrapper.appendChild(title);

        const btnWrap = document.createElement("div");
        btnWrap.style.marginBottom = "6px";
        btnWrap.style.display = "flex";
        btnWrap.style.gap = "4px";

        const selectAll = document.createElement("button");
        selectAll.textContent = "All";
        selectAll.style.fontSize = "11px";
        selectAll.style.padding = "1px 4px";
        selectAll.addEventListener("click", () => {
            wrapper.querySelectorAll("input[type=checkbox]").forEach(cb => {
                cb.checked = true;
                selectedFilters[key].add(normalizeText(cb.dataset.value));
            });
            applyFilters();
        });

        const deselectAll = document.createElement("button");
        deselectAll.textContent = "None";
        deselectAll.style.fontSize = "11px";
        deselectAll.style.padding = "1px 4px";
        deselectAll.addEventListener("click", () => {
            wrapper.querySelectorAll("input[type=checkbox]").forEach(cb => {
                cb.checked = false;
                selectedFilters[key].delete(normalizeText(cb.dataset.value));
            });
            applyFilters();
        });

        btnWrap.appendChild(selectAll);
        btnWrap.appendChild(deselectAll);
        wrapper.appendChild(btnWrap);

        // Используем Map для сортировки по оригинальным значениям
        const sortedItems = Array.from(items)
            .map(value => ({
                normalized: value,
                original: displayValues[key].get(value) || value
            }))
            .sort((a, b) => a.original.localeCompare(b.original));

        sortedItems.forEach(({normalized, original}) => {
            if (!normalized) return;
            
            const id = `${key}-${normalized}`;
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = true;
            checkbox.id = id;
            checkbox.dataset.value = normalized;
            checkbox.style.marginRight = "4px";
            
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    selectedFilters[key].add(normalized);
                } else {
                    selectedFilters[key].delete(normalized);
                }
                applyFilters();
            });

            const labelEl = document.createElement("label");
            labelEl.htmlFor = id;
            labelEl.textContent = original;
            labelEl.style.display = "flex";
            labelEl.style.alignItems = "center";
            labelEl.style.whiteSpace = "nowrap";

            const line = document.createElement("div");
            line.appendChild(checkbox);
            line.appendChild(labelEl);

            wrapper.appendChild(line);
        });

        return wrapper;
    }

    function getCellText(row, index) {
        const ulItems = row.querySelectorAll("ul > li");
        if (!ulItems[index]) return "";
        const text = ulItems[index].textContent || "";
        return normalizeText(text.replace(/^.*?:\s*/, ""));
    }

    function sortTableByColumn(colIndex) {
        const dir = (sortState.col === colIndex) ? -sortState.dir : 1;
        sortState = { col: colIndex, dir };
        const sortedRows = [...rows].sort((a, b) => {
            const aVal = getCellText(a, colIndex);
            const bVal = getCellText(b, colIndex);
            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);
            if (!isNaN(aNum) && !isNaN(bNum)) return (aNum - bNum) * dir;
            return aVal.localeCompare(bVal) * dir;
        });
        sortedRows.forEach(row => tbody.appendChild(row));
    }

    initFilters();

    // === Сортировка ===
    const sortPanel = document.createElement("div");
    sortPanel.style.position = "fixed";
    sortPanel.style.top = "0";
    sortPanel.style.right = "0";
    sortPanel.style.width = "150px";
    sortPanel.style.padding = "10px";
    sortPanel.style.background = "#f9f9f9";
    sortPanel.style.borderBottom = "2px solid #ccc";
    sortPanel.style.borderLeft = "2px solid #ccc";
    sortPanel.style.zIndex = "10000";
    sortPanel.style.fontFamily = "sans-serif";
    sortPanel.style.height = "200px";

    const sortTitle = document.createElement("div");
    sortTitle.innerHTML = `<strong>Sort by:</strong><br>`;
    sortPanel.appendChild(sortTitle);

    headers.forEach((name, idx) => {
        const btn = document.createElement("button");
        btn.textContent = name;
        btn.style.margin = "4px 4px";
        btn.style.padding = "4px 8px";
        btn.style.border = "1px solid #888";
        btn.style.borderRadius = "5px";
        btn.style.cursor = "pointer";
        btn.style.background = "#eee";
        btn.addEventListener("click", () => sortTableByColumn(idx));
        sortPanel.appendChild(btn);
    });

    document.body.appendChild(sortPanel);

    // === Фильтры ===
    const filterPanel = document.createElement("div");
    filterPanel.style.position = "fixed";
    filterPanel.style.top = "0";
    filterPanel.style.left = "0";
    filterPanel.style.right = "160px";
    filterPanel.style.height = "200px";
    filterPanel.style.display = "flex";
    filterPanel.style.flexDirection = "row";
    filterPanel.style.padding = "10px";
    filterPanel.style.background = "#fff";
    filterPanel.style.borderBottom = "2px solid #ccc";
    filterPanel.style.borderRight = "2px solid #ccc";
    filterPanel.style.zIndex = "10000";
    filterPanel.style.fontFamily = "sans-serif";
    filterPanel.style.overflowX = "auto";

    filterPanel.appendChild(createCheckboxes("Host", filters["Host"], "Host"));
    filterPanel.appendChild(createCheckboxes("Status Code", filters["Status Code"], "Status Code"));
    filterPanel.appendChild(createCheckboxes("Technologies", filters["Technologies"], "Technologies"));

    document.body.appendChild(filterPanel);

    document.body.style.paddingTop = "250px";
})();
