/**
 * React Navigation Parameter List Types for Tractor Repair Apps
 */

export type CustomerStackParamList = {
  ChooseLanguage: undefined;
  Auth: undefined;
  OtpVerification: { phone: string };
  Home: undefined;
  SelectTractor: undefined;
  AddTractor: undefined;
  NewRequest: { categoryId?: string; tractorId?: string } | undefined;
  ProblemDetails: { tractorMake: string; tractorModel: string; categoryId: string };
  LocationPicker: { latitude?: number; longitude?: number; address?: string } | undefined;
  FindingMechanic: { requestId: string };
  MechanicAssigned: { jobId: string };
  LiveTracking: { jobId: string };
  ReviewQuote: { jobId: string; quoteId: string };
  JobProgress: { jobId: string };
  BillDetails: { jobId: string; invoiceId: string };
  Payment: { jobId: string; invoiceId: string; amount: number };
  Rating: { jobId: string; mechanicId: string };
  RepairHistory: undefined;
  JobDetails: { jobId: string };
  Profile: undefined;
  Support: { jobId?: string } | undefined;
};

export type MechanicStackParamList = {
  ChooseLanguage: undefined;
  Auth: undefined;
  OtpVerification: { phone: string };
  MechanicRegistration: undefined;
  VerificationPending: undefined;
  Dashboard: undefined;
  NewRequestAlert: { matchId: string; requestId: string; distanceKm?: number };
  JobNavigation: { jobId: string; customerLatitude?: number; customerLongitude?: number };
  StartRepairCode: { jobId: string };
  CreateQuote: { jobId: string };
  QuoteSubmitted: { jobId: string; quoteId: string };
  ActiveRepair: { jobId: string };
  FinishRepairCode: { jobId: string };
  CollectPayment: { jobId: string; invoiceId: string; amount: number };
  Earnings: undefined;
  Settlements: undefined;
  PayPlatformFee: { amount: number };
  JobHistory: undefined;
  JobDetails: { jobId: string };
  MechanicProfile: undefined;
  Support: { jobId?: string } | undefined;
};
