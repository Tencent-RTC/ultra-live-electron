export enum LoginType {
  MobilePhone = 1,
  UserSig = 2,
  SDKSecretKey = 3,
  UserAccount = 4,
}

export type LoginState = {
  privacyGuide: string;
  userAgreement: string;
  mode:string;
  isAgreed: boolean;
  phoneNumber: string;
  mailAddress: string;
  verifyCode: string;
  sessionId: string;
  sdkAppId: string;
  userId: string;
  userSig: string;
  sdkSecretKey: string;
  password: string;
};

export type VerifyStates = {
  countdown: number,
  timer: number,
};
