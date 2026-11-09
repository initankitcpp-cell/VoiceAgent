export const categories = [
  {
    id: 'general',
    name: 'Vocabulary essentials',
    description: 'Your original five-word learning session.',
    question: 'What would you like to learn this week?',
    answer: 'I would like to improve my English.',
    alternatives: ['I want to improve my English.'],
    phrase: {
      hi: 'मैं अपनी अंग्रेज़ी सुधारना चाहता हूँ।',
      mr: 'मला माझे इंग्रजी सुधारायचे आहे.',
      kn: 'ನಾನು ನನ್ನ ಇಂಗ್ಲಿಷ್ ಸುಧಾರಿಸಲು ಬಯಸುತ್ತೇನೆ.',
    },
  },
  {
    id: 'daily',
    name: 'Daily Conversations',
    description: 'Friends, college, food, and everyday requests.',
    question: 'How do you usually travel to college or work?',
    answer: 'Could you please help me?',
    alternatives: ['Can you please help me?', 'Could you help me, please?'],
    phrase: {
      hi: 'क्या आप कृपया मेरी मदद कर सकते हैं?',
      mr: 'कृपया तुम्ही मला मदत करू शकता का?',
      kn: 'ದಯವಿಟ್ಟು ನನಗೆ ಸಹಾಯ ಮಾಡಬಹುದೇ?',
    },
  },
  {
    id: 'interviews',
    name: 'Job Interviews',
    description: 'Introduce yourself and explain your strengths.',
    question: 'Tell me about a skill you would bring to this role.',
    answer: 'I am ready for my interview.',
    alternatives: ['I am prepared for my interview.'],
    phrase: {
      hi: 'मैं अपने साक्षात्कार के लिए तैयार हूँ।',
      mr: 'मी माझ्या मुलाखतीसाठी तयार आहे.',
      kn: 'ನಾನು ನನ್ನ ಸಂದರ್ಶನಕ್ಕೆ ಸಿದ್ಧನಾಗಿದ್ದೇನೆ.',
    },
  },
  {
    id: 'workplace',
    name: 'Workplace English',
    description: 'Team meetings, deadlines, and polite questions.',
    question: 'How would you ask a teammate to clarify a task?',
    answer: 'Could you explain this task again?',
    alternatives: ['Can you explain this task again?', 'Could you explain this task once more?'],
    phrase: {
      hi: 'क्या आप यह काम दोबारा समझा सकते हैं?',
      mr: 'तुम्ही हे काम पुन्हा समजावून सांगू शकता का?',
      kn: 'ಈ ಕೆಲಸವನ್ನು ಮತ್ತೊಮ್ಮೆ ವಿವರಿಸಬಹುದೇ?',
    },
  },
  {
    id: 'service',
    name: 'Customer Service',
    description: 'Help a customer and respond with empathy.',
    question: 'What would you say to a customer whose order is late?',
    answer: 'I will check your order.',
    alternatives: ['I will check on your order.'],
    phrase: {
      hi: 'मैं आपका ऑर्डर जाँचूँगा।',
      mr: 'मी तुमची ऑर्डर तपासेन.',
      kn: 'ನಾನು ನಿಮ್ಮ ಆರ್ಡರ್ ಪರಿಶೀಲಿಸುತ್ತೇನೆ.',
    },
  },
  {
    id: 'travel',
    name: 'Travel',
    description: 'Train tickets, directions, and new places.',
    question: 'How would you ask for directions to the railway station?',
    answer: 'I would like a ticket to Pune.',
    alternatives: ['I would like to buy a ticket to Pune.', 'I want a ticket to Pune.'],
    phrase: {
      hi: 'मुझे पुणे का एक टिकट चाहिए।',
      mr: 'मला पुण्याचे एक तिकीट हवे आहे.',
      kn: 'ನನಗೆ ಪುಣೆಗೆ ಒಂದು ಟಿಕೆಟ್ ಬೇಕು.',
    },
  },
  {
    id: 'business',
    name: 'Business Communication',
    description: 'Clear emails, proposals, and follow-ups.',
    question: 'How would you politely follow up on an unanswered email?',
    answer: 'Please send me the details by email.',
    alternatives: ['Please email me the details.', 'Could you please email me the details?'],
    phrase: {
      hi: 'कृपया मुझे ईमेल से जानकारी भेजें।',
      mr: 'कृपया मला ईमेलने तपशील पाठवा.',
      kn: 'ದಯವಿಟ್ಟು ವಿವರಗಳನ್ನು ನನಗೆ ಇಮೇಲ್ ಮೂಲಕ ಕಳುಹಿಸಿ.',
    },
  },
] as const;
export type CategoryId = (typeof categories)[number]['id'];
export const categoryById = (id: string) =>
  categories.find((category) => category.id === id) ?? categories[0];
