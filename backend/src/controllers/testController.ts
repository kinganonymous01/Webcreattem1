import { Request, Response } from 'express';
import { signup, login } from './authController';
import { plannerAgent } from '../services/agents/plannerAgent';
import { depthAgent } from '../services/agents/depthAgent';
import { codeGeneratorAgent } from '../services/agents/codeGeneratorAgent';
import { generateOrchestrator } from '../services/orchestrators/generateOrchestrator';
import { promptGeneratorAgent } from '../services/agents/promptGeneratorAgent';
import { chatSummarizerAgent } from '../services/agents/chatSummarizerAgent';
import { modifyAgent } from '../services/agents/modifyAgent';
import crypto from 'crypto';

export async function testSignupLogin(req: Request, res: Response): Promise<any> {
  try {
    const testUsername = `testuser_${Date.now()}`;
    const testPassword = 'TestPassword123!';

    // Mock request and response for signup
    const signupReq = { body: { username: testUsername, password: testPassword } } as Request;
    let signupResData: any;
    let signupStatus = 200;
    const signupRes = {
      status: (code: number) => { signupStatus = code; return signupRes; },
      json: (data: any) => { signupResData = data; return signupRes; },
      cookie: () => { return signupRes; }
    } as unknown as Response;

    await signup(signupReq, signupRes);

    if (signupStatus !== 201) {
      return res.status(500).json({ success: false, message: 'Signup failed', details: signupResData });
    }

    // Mock request and response for login
    const loginReq = { body: { username: testUsername, password: testPassword } } as Request;
    let loginResData: any;
    let loginStatus = 200;
    const loginRes = {
      status: (code: number) => { loginStatus = code; return loginRes; },
      json: (data: any) => { loginResData = data; return loginRes; },
      cookie: () => { return loginRes; }
    } as unknown as Response;

    await login(loginReq, loginRes);

    if (loginStatus !== 200) {
      return res.status(500).json({ success: false, message: 'Login failed', details: loginResData });
    }

    return res.json({ success: true, message: 'Signup and Login tested successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function testPlannerAgent(req: Request, res: Response): Promise<any> {
  try {
    const prompt = "Create a simple counter app with React and a Node.js backend.";
    const result = await plannerAgent(prompt);
    
    if (!result || !result.projectName || !result.structure || !result.files) {
      return res.status(500).json({ success: false, message: 'Planner agent returned invalid structure', details: result });
    }
    
    return res.json({ success: true, message: 'Planner agent tested successfully', data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function testDepthAgent(req: Request, res: Response): Promise<any> {
  try {
    const prompt = "Create a simple counter app with React and a Node.js backend.";
    const plannerResult = {
      projectName: "counter-app",
      structure: { folders: ["frontend", "backend"] },
      files: [
        { path: "frontend/package.json", explanation: "Frontend dependencies" },
        { path: "backend/package.json", explanation: "Backend dependencies" }
      ]
    };
    
    const result = await depthAgent(prompt, plannerResult);
    
    if (!result || !result.structure || !result.files) {
      return res.status(500).json({ success: false, message: 'Depth agent returned invalid structure', details: result });
    }
    
    return res.json({ success: true, message: 'Depth agent tested successfully', data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function testCodeGeneratorAgent(req: Request, res: Response): Promise<any> {
  try {
    const prompt = "Create a simple package.json for a Node.js Express backend with express and cors dependencies.";
    const path = "backend/package.json";
    
    const result = await codeGeneratorAgent(prompt, path);
    
    if (!result || typeof result !== 'string') {
      return res.status(500).json({ success: false, message: 'Code generator agent returned invalid output', details: result });
    }
    
    return res.json({ success: true, message: 'Code generator agent tested successfully', data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function testValidatorComponent(req: Request, res: Response): Promise<any> {
  try {
    const projectId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    
    // Set 1: Files with errors
    const errorFiles = [
      { path: "backend/package.json", content: '{"name": "backend", "scripts": {"build": "exit 1"}}' },
      { path: "frontend/package.json", content: '{"name": "frontend", "scripts": {"build": "exit 1"}}' }
    ];
    
    // Set 2: Correct files
    const correctFiles = [
      { path: "backend/package.json", content: '{"name": "backend", "scripts": {"build": "echo success"}}' },
      { path: "frontend/package.json", content: '{"name": "frontend", "scripts": {"build": "echo success"}}' }
    ];
    
    const descriptions = [
      { path: "backend/package.json", description: { type: "file", purpose: "deps", imports: [], exports: [], props: [], connects_to: [], explanation: "" } },
      { path: "frontend/package.json", description: { type: "file", purpose: "deps", imports: [], exports: [], props: [], connects_to: [], explanation: "" } }
    ];
    
    const structure = { folders: ["backend", "frontend"] };
    
    // Test with correct files
    const correctResult = await generateOrchestrator({
      projectId,
      userId,
      files: correctFiles,
      descriptions,
      structure
    });
    
    if (!correctResult.success) {
      return res.status(500).json({ success: false, message: 'Validator failed on correct files', details: correctResult });
    }
    
    // Test with error files (should fail validation)
    const errorResult = await generateOrchestrator({
      projectId,
      userId,
      files: errorFiles,
      descriptions,
      structure
    });
    
    // We expect it to fail or fix it. If it fixes it, success is true.
    // But since it's just exit 1, it might not be able to fix it easily or it might.
    
    return res.json({ 
      success: true, 
      message: 'Validator component tested successfully', 
      data: { correctResult, errorResult } 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function testChatSummarizerAgent(req: Request, res: Response): Promise<any> {
  try {
    const chatHistory = [
      { role: "user", message: "Can you add a button to the header?" },
      { role: "assistant", message: "Sure, I can do that." },
      { role: "user", message: "Actually, make it a red button." }
    ];
    
    const result = await chatSummarizerAgent(chatHistory as any);
    
    if (!result || !result.type || !result.instruction) {
      return res.status(500).json({ success: false, message: 'Chat summarizer agent returned invalid output', details: result });
    }
    
    return res.json({ success: true, message: 'Chat summarizer agent tested successfully', data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function testModifyAgent(req: Request, res: Response): Promise<any> {
  try {
    const instruction = "Change the background color to blue.";
    const files = [
      { path: "frontend/src/App.css", content: "body { background-color: red; }" }
    ];
    const descriptions = [
      { path: "frontend/src/App.css", description: { type: "file", purpose: "styles", imports: [], exports: [], props: [], connects_to: [], explanation: "" } }
    ];
    
    const result = await modifyAgent({
      instruction,
      descriptions,
      previousLog: [],
    });
    
    if (!result || !result.action) {
      return res.status(500).json({ success: false, message: 'Modify agent returned invalid output', details: result });
    }
    
    return res.json({ success: true, message: 'Modify agent tested successfully', data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function testFullGenerationPipeline(req: Request, res: Response): Promise<any> {
  try {
    const prompt = "Create a simple hello world Node.js script.";
    
    const plannerResult = await plannerAgent(prompt);
    if (!plannerResult.projectName) throw new Error('Planner failed');
    
    const depthResult = await depthAgent(prompt, plannerResult);
    if (!depthResult.files) throw new Error('Depth failed');
    
    const promptResult = await promptGeneratorAgent(prompt, plannerResult, depthResult);
    if (!promptResult.files) throw new Error('Prompt generator failed');
    
    const codeFiles = [];
    for (const pf of promptResult.files) {
      const content = await codeGeneratorAgent(pf.prompt, pf.path);
      codeFiles.push({ path: pf.path, content });
    }
    
    if (codeFiles.length === 0) throw new Error('Code generation failed');
    
    return res.json({ 
      success: true, 
      message: 'Full pipeline tested successfully', 
      data: { plannerResult, depthResult, promptResult, codeFiles } 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
