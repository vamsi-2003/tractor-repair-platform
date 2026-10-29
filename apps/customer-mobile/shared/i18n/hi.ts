import type { TranslationsType } from './en';

export const hi: TranslationsType = {
  // Common
  ok: 'ठीक है',
  cancel: 'रद्द करें',
  save: 'सहेजें',
  submit: 'जमा करें',
  loading: 'लोड हो रहा है...',
  error: 'त्रुटि',
  success: 'सफल',
  retry: 'पुनः प्रयास करें',
  back: 'पीछे',
  next: 'आगे',
  done: 'पूर्ण',
  close: 'बंद करें',

  // Auth
  enterMobile: 'अपना मोबाइल नंबर दर्ज करें',
  enterOtp: 'ओटीपी दर्ज करें',
  verifyOtp: 'ओटीपी सत्यापित करें',
  resendCode: 'कोड पुनः भेजें',
  signIn: 'साइन इन करें',
  signOut: 'साइन आउट करें',

  // Language
  chooseLanguage: 'अपनी भाषा चुनें',
  changeLanguage: 'भाषा बदलें',

  // Home
  welcome: 'स्वागत है',
  newRequest: 'नई मरम्मत का अनुरोध',
  repairHistory: 'मरम्मत का इतिहास',
  settings: 'सेटिंग्स',

  // Request
  whatsWrong: 'आपके ट्रैक्टर में क्या खराबी है?',
  tractorMakeModel: 'ट्रैक्टर मेक और मॉडल',
  problemArea: 'समस्या का क्षेत्र',
  speakProblem: 'समस्या बोलकर बताएं (वॉयस नोट)',
  addPhotos: 'फ़ोटो / वीडियो जोड़ें',
  tractorLocation: 'ट्रैक्टर का स्थान',
  movePin: 'पिन को ट्रैक्टर के स्थान पर ले जाएं',
  requestMechanic: 'मैकेनिक का अनुरोध करें',
  findingMechanic: 'नजदीकी मैकेनिक खोज रहे हैं',
  cancelRequest: 'अनुरोध रद्द करें',
  requestSent: 'अनुरोध भेज दिया गया',

  // Categories
  engine: 'इंजन',
  hydraulics: 'हाइड्रोलिक्स',
  clutchGearbox: 'क्लच / गियरबॉक्स',
  tyres: 'टायर',
  electrical: 'इलेक्ट्रिकल',
  other: 'अन्य',

  // Mechanic
  mechanicAssigned: 'मैकेनिक नियुक्त किया गया',
  arrivesIn: 'पहुंचने का समय',
  kmAway: 'कि.मी दूर',
  startCode: 'स्टार्ट कोड',
  tellMechanicCode: 'मरम्मत शुरू करने के लिए यह कोड मैकेनिक को बताएं',
  callMechanic: 'मैकेनिक को कॉल करें',
  mechanicProfile: 'मैकेनिक प्रोफाइल',
  rating: 'रेटिंग',
  servicesDone: 'की गई सेवाएं',

  // Quote
  approveQuote: 'मरम्मत कोटेशन स्वीकृत करें',
  visitCharge: 'विजिट चार्ज',
  repairQuote: 'मरम्मत कोटेशन',
  mechanicFound: 'मैकेनिक मिल गया',
  mechanicNotes: 'मैकेनिक के नोट्स',
  approveAndStart: 'स्वीकार करें और शुरू करें',
  declineQuote: 'कोटेशन अस्वीकार करें',

  // Bill
  yourBill: 'आपका बिल',
  visitChargeLabel: 'विजिट चार्ज',
  repairLabel: 'मरम्मत और मजदूरी',
  sparePartsLabel: 'स्पेयर पार्ट्स',
  totalLabel: 'कुल राशि',
  finishCode: 'फ़िनिश कोड',
  payOnline: 'ऑनलाइन भुगतान करें',
  payCash: 'नकद भुगतान करें',
  problemWithBill: 'बिल में कोई समस्या है?',

  // Payment
  paymentDone: 'भुगतान पूर्ण हुआ',
  upiOrCard: 'यूपीआई / कार्ड / नेटबैंकिंग',
  cashToMechanic: 'मैकेनिक को नकद भुगतान किया',

  // Rating
  howWas: 'सेवा कैसी थी?',
  yourRating: 'आपकी रेटिंग',
  whatWentWell: 'क्या अच्छा लगा?',
  arrivedOnTime: 'समय पर पहुंचे',
  fixedProperly: 'सही तरीके से ठीक किया',
  fairPrice: 'उचित मूल्य',
  polite: 'विनम्र व्यवहार',
  anythingElse: 'कुछ और बताना चाहते हैं? (वैकल्पिक)',
  submitRating: 'रेटिंग जमा करें',
  reportProblem: 'समस्या की शिकायत करें',

  // Mechanic app
  joinAsMechanic: 'मैकेनिक के रूप में जुड़ें',
  fullName: 'पूरा नाम',
  whatCanYouRepair: 'आप क्या मरम्मत कर सकते हैं?',
  uploadId: 'पहचान पत्र अपलोड करें',
  takePhoto: 'फ़ोटो लें',
  submitForApproval: 'मंजूरी के लिए जमा करें',
  signInToTakeJobs: 'काम लेने के लिए साइन इन करें',
  youreOnline: 'आप ऑनलाइन हैं',
  youreOffline: 'आप ऑफलाइन हैं',
  todayJobs: 'आज के काम',
  todayEarnings: 'आज की कमाई',
  platformFeeBalance: 'प्लेटफ़ॉर्म शुल्क बकाया',
  payNow: 'अभी भुगतान करें',
  waitingForRequests: 'मरम्मत अनुरोधों की प्रतीक्षा कर रहे हैं...',
  newRequestNearYou: 'आपके पास नया अनुरोध आया है!',
  accept: 'स्वीकार करें',
  decline: 'अस्वीकार करें',
  acceptJob: 'काम स्वीकार करें',
  headToCustomer: 'ग्राहक के स्थान के लिए निकलें',
  callCustomer: 'ग्राहक को कॉल करें',
  navigate: 'नेविगेट करें',
  startCodeFromCustomer: 'ग्राहक से स्टार्ट कोड दर्ज करें',
  sendQuote: 'मरम्मत कोटेशन भेजें',
  startRepair: 'मरम्मत शुरू करें',
  finishJob: 'काम पूरा करें',
  collectPayment: 'भुगतान प्राप्त करें',
  cashReceived: 'नकद प्राप्त हुआ',
  markJobDone: 'काम पूरा चिह्नित करें',
  finishCodeFromCustomer: 'ग्राहक से फ़िनिश कोड दर्ज करें',
  approvedRepairQuote: 'स्वीकृत मरम्मत कोटेशन',
};
