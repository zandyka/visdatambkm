// --- [ HARAP DIGANTI ] ---
const API_KEY = 'AIzaSyBDt2mIFSVmjkpgNBXXS3n5MO_Q99p93nQ'; 
const SPREADSHEET_ID = '1VtMbjMJPnzBKCEKgIRkNJIo0saD2RjiOJsMtlGXuFSc'; 
const RANGE = 'Sheet1!A:O';
// --------------------------

const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

// Variabel global
let allData = [];
let headers = [];
let topPerformersChart;
let gradeDistributionChart;

// Elemen DOM (DIKEMBALIKAN)
const searchInput = document.getElementById('searchInput');
const penempatanFilter = document.getElementById('penempatanFilter');
const gradeFilter = document.getElementById('gradeFilter');
const tableHead = document.querySelector('#dataTable thead');
const tableBody = document.querySelector('#dataTable tbody');

// BARU: Daftarkan plugin datalabels secara global
Chart.register(ChartDataLabels);

// Fungsi utama
document.addEventListener('DOMContentLoaded', fetchData);

// 1. Mengambil data dari Google Sheets API
async function fetchData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        headers = data.values[0];
        allData = data.values.slice(1).map(row => {
            let rowObject = {};
            headers.forEach((header, index) => {
                if (header === "Total Nilai") {
                    rowObject[header] = parseFloat(row[index]) || 0;
                } else {
                    rowObject[header] = row[index] || '';
                }
            });
            return rowObject;
        });

        tableBody.innerHTML = '';

        // DIKEMBALIKAN: Panggil fungsi-fungsi versi global/semula
        populateFilters();
        renderTable(allData);
        renderCharts(allData);

        // DIKEMBALIKAN: Event listener untuk filter global
        searchInput.addEventListener('input', applyFilters);
        penempatanFilter.addEventListener('change', applyFilters);
        gradeFilter.addEventListener('change', applyFilters);

    } catch (error) {
        console.error("Error fetching data:", error);
        tableBody.innerHTML = `<tr><td colspan="${headers.length}" class="loading" style="color: red;">Gagal memuat data. Periksa API Key dan Spreadsheet ID.</td></tr>`;
    }
}

// 2. DIKEMBALIKAN: Mengisi filter dropdown global
function populateFilters() {
    const penempatanOptions = new Set();
    const gradeOptions = new Set();

    allData.forEach(row => {
        if (row.Penempatan) penempatanOptions.add(row.Penempatan);
        if (row.Grade) gradeOptions.add(row.Grade);
    });

    penempatanOptions.forEach(option => {
        const el = document.createElement('option');
        el.value = option;
        el.textContent = option;
        penempatanFilter.appendChild(el);
    });

    gradeOptions.forEach(option => {
        const el = document.createElement('option');
        el.value = option;
        el.textContent = option;
        gradeFilter.appendChild(el);
    });
}

// 3. DIKEMBALIKAN: Fungsi render tabel versi sederhana
function renderTable(data) {
    // Kosongkan tabel
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    // Buat Header Tabel
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
        if (headerText) {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        }
    });
    tableHead.appendChild(headerRow);

    // Isi Body Tabel
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${headers.length}" class="loading">Tidak ada data yang cocok.</td></tr>`;
        return;
    }
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            if (header) {
                const td = document.createElement('td');
                td.textContent = row[header];
                tr.appendChild(td);
            }
        });
        tableBody.appendChild(tr);
    });
}

// 4. Membuat dan memperbarui grafik (chart)
function renderCharts(data) {
    const scoredData = data.filter(row => row['Total Nilai'] > 0);

    // --- Chart 1: Top 5 Performers ---
    // (Tidak ada perubahan di sini, sudah benar)
    const sortedData = [...scoredData].sort((a, b) => b['Total Nilai'] - a['Total Nilai']);
    const top5 = sortedData.slice(0, 5);
    const top5Labels = top5.map(row => row['Nama lengkap']);
    const top5Scores = top5.map(row => row['Total Nilai']);
    const rankColors = [
        'rgba(255, 215, 0, 0.7)', 'rgba(192, 192, 192, 0.7)', 'rgba(205, 127, 50, 0.7)',
        'rgba(0, 90, 156, 0.7)', 'rgba(108, 117, 125, 0.7)'
    ];
    const rankBorderColors = [
        'rgba(255, 215, 0, 1)', 'rgba(192, 192, 192, 1)', 'rgba(205, 127, 50, 1)',
        'rgba(0, 90, 156, 1)', 'rgba(108, 117, 125, 1)'
    ];

    const ctxTop5 = document.getElementById('topPerformersChart').getContext('2d');
    if (topPerformersChart) { topPerformersChart.destroy(); }
    topPerformersChart = new Chart(ctxTop5, {
        type: 'bar',
        data: {
            labels: top5Labels,
            datasets: [{
                label: 'Total Nilai',
                data: top5Scores,
                backgroundColor: rankColors,
                borderColor: rankBorderColors,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            scales: { x: { beginAtZero: true } },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // --- Chart 2: Grade Distribution (BANYAK PERUBAHAN DI SINI) ---
    const gradeCounts = {};
    let totalScored = 0; // Hitung total untuk persen
    scoredData.forEach(row => {
        const grade = row.Grade || 'N/A';
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        totalScored++; // Tambah total
    });
    
    // Panggil fungsi BARU untuk buat legenda kustom
    renderCustomLegend(gradeCounts);

    const gradeLabels = Object.keys(gradeCounts);
    const gradeData = Object.values(gradeCounts);

    const ctxGrade = document.getElementById('gradeDistributionChart').getContext('2d');
    if (gradeDistributionChart) { gradeDistributionChart.destroy(); }
    gradeDistributionChart = new Chart(ctxGrade, {
        type: 'pie',
        data: {
            labels: gradeLabels,
            datasets: [{
                label: 'Jumlah Peserta',
                data: gradeData,
                backgroundColor: [
                    'rgba(40, 167, 69, 0.7)', 'rgba(0, 123, 255, 0.7)', 'rgba(255, 193, 7, 0.7)',
                    'rgba(220, 53, 69, 0.7)', 'rgba(108, 117, 125, 0.7)'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                // BARU: Nonaktifkan legenda bawaan
                legend: {
                    display: false 
                },
                // BARU: Konfigurasi plugin datalabels (untuk persen)
                datalabels: {
                    formatter: (value, ctx) => {
                        // Hitung persen
                        let percentage = ((value / totalScored) * 100).toFixed(0) + '%';
                        return percentage;
                    },
                    color: '#fff', // Warna teks persen
                    font: {
                        weight: 'bold',
                        size: 14
                    }
                }
            }
        }
    });
}

// 5. BARU: Fungsi untuk membuat legenda kustom (keterangan)
function renderCustomLegend(gradeCounts) {
    const legendContainer = document.getElementById('gradeLegend');
    legendContainer.innerHTML = ''; // Kosongkan dulu
    
    const ul = document.createElement('ul');
    
    // Urutkan grade (opsional, tapi lebih rapi)
    const sortedGrades = Object.keys(gradeCounts).sort();
    
    for (const grade of sortedGrades) {
        const count = gradeCounts[grade];
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong>Grade ${grade}</strong></span>
            <span>${count} orang</span>
        `;
        ul.appendChild(li);
    }
    
    legendContainer.appendChild(ul);
}


// 6. DIKEMBALIKAN: Fungsi filter versi global
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const penempatan = penempatanFilter.value;
    const grade = gradeFilter.value;

    const filteredData = allData.filter(row => {
        const nameMatch = row['Nama lengkap'].toLowerCase().includes(searchTerm);
        const penempatanMatch = (penempatan === '') || (row.Penempatan === penempatan);
        const gradeMatch = (grade === '') || (row.Grade === grade);

        return nameMatch && penempatanMatch && gradeMatch;
    });

    // Render ulang tabel dan chart dengan data yang sudah difilter
    renderTable(filteredData);
    renderCharts(filteredData);
}