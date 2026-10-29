export const en = {
  // Common
  ok: 'OK',
  cancel: 'Cancel',
  save: 'Save',
  submit: 'Submit',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  retry: 'Retry',
  back: 'Back',
  next: 'Next',
  done: 'Done',
  close: 'Close',

  // Auth
  enterMobile: 'Enter your mobile number',
  enterOtp: 'Enter OTP',
  verifyOtp: 'Verify OTP',
  resendCode: 'Resend Code',
  signIn: 'Sign In',
  signOut: 'Sign Out',

  // Language
  chooseLanguage: 'Choose Language',
  changeLanguage: 'Change Language',

  // Home
  welcome: 'Welcome',
  newRequest: 'New Repair Request',
  repairHistory: 'Repair History',
  settings: 'Settings',

  // Request
  whatsWrong: "What's wrong with your tractor?",
  tractorMakeModel: 'Tractor Make & Model',
  problemArea: 'Problem Area',
  speakProblem: 'Speak Problem (Voice Note)',
  addPhotos: 'Add Photos / Videos',
  tractorLocation: 'Tractor Location',
  movePin: 'Move pin to tractor location',
  requestMechanic: 'Request Mechanic',
  findingMechanic: 'Finding nearby mechanic...',
  cancelRequest: 'Cancel Request',
  requestSent: 'Request Sent',

  // Categories
  engine: 'Engine',
  hydraulics: 'Hydraulics',
  clutchGearbox: 'Clutch / Gearbox',
  tyres: 'Tyres & Brakes',
  electrical: 'Electrical',
  other: 'Other',

  // Mechanic
  mechanicAssigned: 'Mechanic Assigned',
  arrivesIn: 'Arrives in',
  kmAway: 'km away',
  startCode: 'Start Code',
  tellMechanicCode: 'Tell this code to mechanic to start repair',
  callMechanic: 'Call Mechanic',
  mechanicProfile: 'Mechanic Profile',
  rating: 'Rating',
  servicesDone: 'Services Done',

  // Quote
  approveQuote: 'Approve Repair Quote',
  visitCharge: 'Visit Charge',
  repairQuote: 'Repair Quote',
  mechanicFound: 'Mechanic Found',
  mechanicNotes: 'Mechanic Notes',
  approveAndStart: 'Approve & Start',
  declineQuote: 'Decline Quote',

  // Bill
  yourBill: 'Your Bill',
  visitChargeLabel: 'Visit Charge',
  repairLabel: 'Repair & Labor',
  sparePartsLabel: 'Spare Parts',
  totalLabel: 'Total Amount',
  finishCode: 'Finish Code',
  payOnline: 'Pay Online',
  payCash: 'Pay Cash',
  problemWithBill: 'Problem with Bill?',

  // Payment
  paymentDone: 'Payment Completed',
  upiOrCard: 'UPI / Card / Netbanking',
  cashToMechanic: 'Cash Paid to Mechanic',

  // Rating
  howWas: 'How was the service?',
  yourRating: 'Your Rating',
  whatWentWell: 'What went well?',
  arrivedOnTime: 'Arrived on time',
  fixedProperly: 'Fixed properly',
  fairPrice: 'Fair price',
  polite: 'Polite behaviour',
  anythingElse: 'Anything else? (Optional)',
  submitRating: 'Submit Rating',
  reportProblem: 'Report a Problem',

  // Mechanic app
  joinAsMechanic: 'Join as Mechanic',
  fullName: 'Full Name',
  whatCanYouRepair: 'What can you repair?',
  uploadId: 'Upload ID Proof',
  takePhoto: 'Take Photo',
  submitForApproval: 'Submit for Approval',
  signInToTakeJobs: 'Sign In to Take Jobs',
  youreOnline: "You're Online",
  youreOffline: "You're Offline",
  todayJobs: "Today's Jobs",
  todayEarnings: "Today's Earnings",
  platformFeeBalance: 'Platform Fee Balance',
  payNow: 'Pay Now',
  waitingForRequests: 'Waiting for repair requests...',
  newRequestNearYou: 'New Request Near You!',
  accept: 'Accept',
  decline: 'Decline',
  acceptJob: 'Accept Job',
  headToCustomer: 'Head to Customer Location',
  callCustomer: 'Call Customer',
  navigate: 'Navigate',
  startCodeFromCustomer: 'Enter Start Code from Customer',
  sendQuote: 'Send Repair Quote',
  startRepair: 'Start Repair',
  finishJob: 'Finish Job',
  collectPayment: 'Collect Payment',
  cashReceived: 'Cash Received',
  markJobDone: 'Mark Job Done',
  finishCodeFromCustomer: 'Enter Finish Code from Customer',
  approvedRepairQuote: 'Approved Repair Quote',
} as const;

export type TranslationKey = keyof typeof en;
export type TranslationsType = Record<TranslationKey, string>;
