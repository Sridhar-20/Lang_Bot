import { useState, useEffect } from 'react';

const useVoices = () => {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      
      // Filter for Google voices in US, UK, or Indian English
      const googleVoices = availableVoices.filter(v => 
        v.name.includes('Google') && 
        (v.lang.includes('en-US') || v.lang.includes('en-GB') || v.lang.includes('en-IN'))
      );

      // Use Google voices if available, otherwise fallback to any English voices
      const finalVoices = googleVoices.length > 0 ? googleVoices : availableVoices.filter(v => v.lang.includes('en'));
      
      setVoices(finalVoices);
      
      // Set default to the first one if not already set
      if (finalVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(finalVoices[0]);
      }
    };

    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  return { voices, selectedVoice, setSelectedVoice };
};

export default useVoices;
