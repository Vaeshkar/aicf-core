interface ApiResponse<T> {
  success: boolean;
  data: T | T[];
  errors?: string[];
}
export default ApiResponse;