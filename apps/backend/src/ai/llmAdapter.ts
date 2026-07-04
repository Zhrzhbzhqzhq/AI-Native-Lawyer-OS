export interface LlmAdapter {
  generate(promptPack: any): Promise<any>;
}

export default LlmAdapter;
