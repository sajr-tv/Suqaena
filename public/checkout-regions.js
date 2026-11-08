// SUQAENA destination-aware region selector. No customer details are submitted here.
document.addEventListener('DOMContentLoaded', () => {
  const country = document.querySelector('.checkout-country select[name="country"]');
  const region = document.getElementById('checkout-region');
  const label = document.getElementById('checkout-region-label');
  if (!country || !region || !label) return;
  const regions = {
    AE: ['Abu Dhabi','Ajman','Dubai','Fujairah','Ras Al Khaimah','Sharjah','Umm Al Quwain'],
    SA: ['Al Bahah','Al Jawf','Al Madinah','Al Qassim','Asir','Eastern Province','Hail','Jazan','Makkah','Najran','Northern Borders','Riyadh','Tabuk'],
    OM: ['Ad Dakhiliyah','Ad Dhahirah','Al Batinah North','Al Batinah South','Al Buraimi','Al Wusta','Ash Sharqiyah North','Ash Sharqiyah South','Dhofar','Musandam','Muscat'],
    QA: ['Al Daayen','Al Khor and Al Thakhira','Al Rayyan','Al Shahaniya','Al Shamal','Al Wakrah','Doha','Umm Salal'],
    KW: ['Al Ahmadi','Al Asimah (Capital)','Al Farwaniyah','Al Jahra','Hawalli','Mubarak Al Kabeer'],
    BH: ['Capital','Muharraq','Northern','Southern'],
    US: ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','District of Columbia'],
    CA: ['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon'],
    AU: ['Australian Capital Territory','New South Wales','Northern Territory','Queensland','South Australia','Tasmania','Victoria','Western Australia'],
    PK: ['Azad Jammu and Kashmir','Balochistan','Gilgit-Baltistan','Islamabad Capital Territory','Khyber Pakhtunkhwa','Punjab','Sindh'],
    IN: ['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'],
    GB: ['England','Northern Ireland','Scotland','Wales'],
    DE: ['Baden-Württemberg','Bavaria','Berlin','Brandenburg','Bremen','Hamburg','Hesse','Lower Saxony','Mecklenburg-Vorpommern','North Rhine-Westphalia','Rhineland-Palatinate','Saarland','Saxony','Saxony-Anhalt','Schleswig-Holstein','Thuringia'],
    FR: ['Auvergne-Rhône-Alpes','Bourgogne-Franche-Comté','Brittany','Centre-Val de Loire','Corsica','Grand Est','Hauts-de-France','Île-de-France','Normandy','Nouvelle-Aquitaine','Occitanie','Pays de la Loire','Provence-Alpes-Côte d’Azur','Guadeloupe','French Guiana','Martinique','Mayotte','Réunion']
  };
  const selectedCountry = country.value;
  const values = regions[selectedCountry];
  label.textContent = ({AE:'Emirate',SA:'Province',OM:'Governorate',QA:'Municipality',KW:'Governorate',BH:'Governorate',GB:'Nation',US:'State',CA:'Province / Territory',AU:'State / Territory',PK:'Province / Region',IN:'State / Union Territory',DE:'State',FR:'Region'})[selectedCountry] || 'State / Region';
  if (values?.length) {
    const select = document.createElement('select');
    select.id = 'checkout-region'; select.name = 'region'; select.autocomplete = 'address-level1';
    select.required = true;
    const first = document.createElement('option'); first.value = ''; first.textContent = 'Select ' + label.textContent.toLowerCase(); first.disabled = true; first.selected = true; select.append(first);
    for (const name of values) { const option = document.createElement('option'); option.value = name; option.textContent = name; select.append(option); }
    region.replaceWith(select);
  } else {
    region.placeholder = 'Enter state or region';
    region.required = true;
  }
});
