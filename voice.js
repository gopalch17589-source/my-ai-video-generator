// 🎙️ Voice Box
// Step 2: Voice Box basic setup

window.VoiceBox = {
    selectedLanguage: "te-IN",
    selectedGender: "female",
    extractedText: "",

    setLanguage(language) {
        this.selectedLanguage = language;
        console.log("Language:", language);
    },

    setGender(gender) {
        this.selectedGender = gender;
        console.log("Gender:", gender);
    },

    setText(text) {
        this.extractedText = text;
    },

    getText() {
        return this.extractedText;
    }
};

console.log("🎙️ Voice Box loaded successfully.");
