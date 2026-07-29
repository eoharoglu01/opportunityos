export type ApiResponse<T> = {
  data?: T;
  error?: string;
  success: boolean;
};

export type ApiError = {
  message: string;
  status: number;
};
