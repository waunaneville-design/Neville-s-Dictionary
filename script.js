const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/'; 
const FAVORITES_KEY = 'wordlyFavorites'; // Key for storing favorites in localStorage
const THEME_KEY = 'wordlyTheme'; // Key for storing theme preference in localStorage

const searchForm = document.getElementById('searchForm'); // Form element for searching words
const searchInput = document.getElementById('searchInput'); // Input field for entering the word to search
const statusMessage = document.getElementById('statusMessage'); // Element for displaying status messages to the user (e.g., loading, errors)
const resultSection = document.getElementById('resultSection'); // Section that displays the search results (definitions, synonyms, etc.)
const resultWord = document.getElementById('resultWord'); // Element for displaying the searched word in the results section
const resultPhonetic = document.getElementById('resultPhonetic'); // Element for displaying the phonetic transcription of the searched word in the results section
const definitionList = document.getElementById('definitionList'); // Element for displaying the list of definitions for the searched word
const synonymList = document.getElementById('synonymList'); // Element for displaying the list of synonyms for the searched word in the results section
const sourceLinks = document.getElementById('sourceLinks'); // Element for displaying source links for the searched word
const favoritesList = document.getElementById('favoritesList'); // Element for displaying the list of favorite words
const saveButton = document.getElementById('saveButton'); // Button for saving the current word as a favorite
const themeToggle = document.getElementById('themeToggle'); // Button for toggling the theme preference

let currentWord = '';
let favorites = [];

const readFavorites = () => {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; // Attempt to read the favorites list from localStorage and parse it as JSON. If it doesn't exist, return an empty array.
  } catch {
    return [];
  }
};

const writeFavorites = () => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); // Convert the favorites array to a JSON string and store it in localStorage under the key defined by FAVORITES_KEY.
};

const setStatus = (text, type = 'info') => {
  statusMessage.textContent = text;
  statusMessage.style.color = type === 'error' ? 'var(--error)' : 'var(--muted)'; // Set the text content of the statusMessage element to the provided text and change its color based on the type (error or info).
};

const renderFavorites = () => {
  if (!favorites.length) {
    favoritesList.innerHTML = '<li>No favorites yet. Save a word to keep it handy.</li>'; // If the favorites array is empty, display a message indicating that there are no favorites yet and prompt the user to save a word.
    return;
  }

  favoritesList.innerHTML = favorites
    .map(
      (word) => `
        <li class="favorite-item">
          <button type="button" class="favorite-word" data-word="${word}">${word}</button>
          <button type="button" class="remove-favorite" data-word="${word}" aria-label="Remove ${word} from favorites">×</button>
        </li>
      `
    )
    .join(''); // Map over the favorites array to create a list item for each favorite word, including a button to fetch the word's definition and a button to remove it from favorites. Join the resulting array of HTML strings into a single string and set it as the innerHTML of the favoritesList element.

  favoritesList.querySelectorAll('.favorite-word').forEach((button) => {
    button.addEventListener('click', () => fetchWord(button.dataset.word)); // Add a click event listener to each favorite word button that calls the fetchWord function with the corresponding word when clicked.
  });

  favoritesList.querySelectorAll('.remove-favorite').forEach((button) => {
    button.addEventListener('click', () => {
      favorites = favorites.filter((item) => item !== button.dataset.word); // Add a click event listener to each remove button that filters the favorites array to remove the corresponding word when clicked.
      writeFavorites();
      renderFavorites();
      if (currentWord === button.dataset.word) updateSaveButton(); // If the currently displayed word is the one being removed from favorites, update the save button state accordingly.
    });
  });
};

const updateSaveButton = () => {
  const saved = favorites.includes(currentWord.toLowerCase()); // Check if the current word is already in the favorites list (case-insensitive).
  saveButton.textContent = saved ? 'Saved' : 'Save word'; // Update the text content of the save button to indicate whether the current word is already saved as a favorite.
  saveButton.disabled = !currentWord;
  saveButton.style.opacity = saved ? '0.8' : '1'; // Update the text content of the save button to indicate whether the current word is already saved as a favorite. Disable the button if there is no current word, and adjust its opacity based on whether it is saved or not.
};

const renderDefinitions = (data) => { // Render the definitions and related information for the searched word based on the data returned from the API.
  const [entry] = data;
  currentWord = entry.word || '';
  const phonetic = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || ''; // Attempt to extract the phonetic transcription from the entry, checking multiple possible properties for compatibility with different API response formats.
  const sourceUrls = entry.sourceUrls || [];

  resultWord.textContent = currentWord;
  resultPhonetic.textContent = phonetic; // Set the text content of the resultWord and resultPhonetic elements to display the searched word and its phonetic transcription in the results section.
  resultSection.classList.remove('hidden'); // Make the result section visible by removing the 'hidden' class.

  definitionList.innerHTML = entry.meanings 
    .map((meaning) => // Map over the meanings array in the entry to create HTML for each meaning, including its part of speech and definitions.
      meaning.definitions
        .map(
          (item) => `
          <div class="definition-card">
            <h3>${meaning.partOfSpeech}</h3> // Display the part of speech for the current meaning.
            <p>${item.definition}</p>
            ${item.example ? `<p class="example">"${item.example}"</p>` : ''} // If an example is provided for the definition, include it in the HTML with a specific class for styling.
          </div>
        `
        )
        .join('')
    )
    .join(''); // Join the resulting array of HTML strings for each meaning into a single string and set it as the innerHTML of the definitionList element to display all definitions for the searched word.

  const synonyms = entry.meanings
    .flatMap((meaning) => meaning.definitions.flatMap((def) => def.synonyms || [])) // Use flatMap to extract synonyms from all definitions across all meanings, creating a single array of synonyms.
    .filter((value, index, self) => value && self.indexOf(value) === index); // Filter the synonyms array to remove any falsy values and ensure that only unique synonyms are included (i.e., each synonym appears only once in the list).

  synonymList.innerHTML = synonyms.length // If there are any synonyms, create an HTML list to display them; otherwise, set the innerHTML to an empty string.
    ? `
      <strong>Synonyms</strong>
      <ul>${synonyms.map((syn) => `<li>${syn}</li>`).join('')}</ul> // Map over the synonyms array to create a list item for each synonym, join them into a single string, and wrap them in an unordered list with a strong label.
    `
    : '';

  sourceLinks.innerHTML = sourceUrls.length // If there are any source URLs, create an HTML section to display them as clickable links; otherwise, set the innerHTML to an empty string.
    ? `
      <strong>Source</strong>
      ${sourceUrls.map((url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`).join('<br/>')} // Map over the sourceUrls array to create an anchor element for each URL, join them with line breaks, and wrap them in a strong label.
    `
    : '';

  updateSaveButton(); // After rendering the definitions and related information, call the updateSaveButton function to ensure that the save button's state is updated based on whether the current word is already saved as a favorite or not.
};

const fetchWord = async (word) => { // Fetch the definition and related information for the specified word from the API, handle the response, and update the UI accordingly.
  const normalized = word.trim().toLowerCase(); // Normalize the input word by trimming whitespace and converting it to lowercase to ensure consistent formatting for the API request and comparisons.
  if (!normalized) {
    setStatus('Please enter a word to search.', 'error') // If the normalized word is empty (i.e., the user did not enter any valid input), set an error status message prompting the user to enter a word and return early from the function to prevent making an API request with invalid input.;
    return;
  }

  setStatus('Searching…');
  resultSection.classList.add('hidden'); // Set a status message indicating that the search is in progress and hide the result section while waiting for the API response.
  currentWord = normalized; // Update the currentWord variable with the normalized input word to keep track of the currently displayed word in the results section.
  updateSaveButton();

  try {
    const response = await fetch(`${API_BASE}${encodeURIComponent(normalized)}`); // Make a fetch request to the API using the base URL and the encoded normalized word to retrieve its definition and related information.
    if (!response.ok) throw new Error('Word not found');
    const data = await response.json();
    renderDefinitions(data);
    setStatus('Definition loaded successfully.');
  } catch {
    setStatus('Unable to find that word. Check spelling or try another entry.', 'error'); // If the fetch request fails (e.g., the word is not found or there is a network error), catch the error and set an error status message indicating that the word could not be found, and hide the result section to clear any previous results.
    resultSection.classList.add('hidden');
  }
};

searchForm.addEventListener('submit', (event) => { // Add a submit event listener to the search form that prevents the default form submission behavior and calls the fetchWord function with the value entered in the search input field when the form is submitted.
  event.preventDefault();
  fetchWord(searchInput.value);
});

saveButton.addEventListener('click', () => {
  const word = currentWord.toLowerCase();
  if (!word || favorites.includes(word)) return; // When the save button is clicked, check if there is a current word to save and if it is not already in the favorites list. If either condition is true (i.e., there is no current word or it is already saved), return early from the function to prevent adding duplicates or saving an empty entry.
  favorites.unshift(word);
  if (favorites.length > 10) favorites.pop();
  writeFavorites();
  renderFavorites();
  updateSaveButton();
  setStatus(`Saved "${word}" to favorites.`);
}); // If the current word is valid and not already in the favorites list, add it to the beginning of the favorites array, ensure that the list does not exceed 10 items by removing the last item if necessary, write the updated favorites list to localStorage, re-render the favorites list in the UI, update the save button state, and set a status message confirming that the word has been saved to favorites.

themeToggle.addEventListener('click', () => {
  const activeTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; // When the theme toggle button is clicked, determine the new active theme by checking the current theme stored in the data-theme attribute of the document's root element. If the current theme is 'dark', set the active theme to 'light'; otherwise, set it to 'dark'.
  document.documentElement.dataset.theme = activeTheme;
  themeToggle.textContent = activeTheme === 'dark' ? 'Light mode' : 'Dark mode'; // Update the text content of the theme toggle button to reflect the new active theme, indicating to the user what mode they can switch to by clicking the button again.
  localStorage.setItem(THEME_KEY, activeTheme); // Store the new active theme in localStorage under the key defined by THEME_KEY to persist the user's theme preference across sessions and page reloads.
});

const loadTheme = () => {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light'; // Load the saved theme preference from localStorage using the key defined by THEME_KEY. If no preference is found, default to 'light'.
  document.documentElement.dataset.theme = savedTheme;
  themeToggle.textContent = savedTheme === 'dark' ? 'Light mode' : 'Dark mode'; // When the page loads, call the loadTheme function to retrieve the saved theme preference from localStorage (defaulting to 'light' if no preference is found), set the data-theme attribute of the document's root element to apply the saved theme, and update the text content of the theme toggle button to reflect the current theme and indicate the option for switching themes.
};

const init = () => { // Initialize the application by loading the favorites list from localStorage, rendering the favorites in the UI, loading the saved theme preference, and updating the save button state based on the current word and favorites list.
  favorites = readFavorites(); // Read the favorites list from localStorage using the readFavorites function and store it in the favorites variable to keep track of the user's saved favorite words.
  renderFavorites(); // Call the renderFavorites function to display the list of favorite words in the UI based on the favorites array.
  loadTheme(); // Call the loadTheme function to apply the user's saved theme preference when the application initializes.
  updateSaveButton(); // Call the updateSaveButton function to ensure that the save button's state is correctly set based on whether there is a current word and whether it is already saved as a favorite when the application initializes.
};

init(); // Call the init function to start the application and set up the initial state, including loading favorites, applying the saved theme, and updating the save button.
