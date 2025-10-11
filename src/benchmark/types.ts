export interface BenchmarkCommand {
  rawComment: string;
}

export interface BenchmarkParseResult {
  success: boolean;
  benchmarkCommand?: BenchmarkCommand;
  error?: string;
}

export interface BenchmarkProcessingResult {
  success: boolean;
  benchmarkCommand?: BenchmarkCommand;
  errorMessage?: string;
  authorizedUser?: string;
  isAuthorized?: boolean;
  isBenchmarkAttempt?: boolean;
}

export interface BenchmarkConfig {
  targetRepo: string;
  workflowFile: string;
  allowedSourceRepo: string;
}
