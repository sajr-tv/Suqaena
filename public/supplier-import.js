const upload = document.getElementById('csv-file');
const csv = document.getElementById('csv');
upload.addEventListener('change', async () => {
  upload.setCustomValidity('');
  const file = upload.files[0];
  if (!file) return;
  csv.value = '';
  if (!/\.csv$/i.test(file.name) || file.size > 500000) {
    upload.setCustomValidity('Choose a CSV file of 500 KB or less.');
    upload.reportValidity();
    return;
  }
  try {
    csv.value = await file.text();
  } catch {
    upload.setCustomValidity('Unable to read the CSV file.');
    upload.reportValidity();
  }
});
