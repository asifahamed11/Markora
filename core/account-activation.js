export const accountLabels={chatgpt:'ChatGPT','claude-code':'Claude Code','google-account':'Google'};

// A cached login is not a successful inference. Settings can activate only the
// exact provider/model pair that passed a real test; unrelated preferences are
// still editable for an existing account.
export function assertAccountActivation(current,next,connections){
 if(!accountLabels[next.provider]||(current.provider===next.provider&&current.model===next.model))return;
 const result=connections[next.provider];
 if(result?.connected&&result.tested&&result.model===next.model)return;
 throw new Error(`${accountLabels[next.provider]} / ${next.model} has not passed a model test. Click "Test model & use this account" first. Your active AI has not changed.`);
}

export function mergeAccountStatus(status,previous){
 if(!previous?.testedAt)return status;
 // Status checks only inspect sign-in. They cannot erase an inference failure
 // or upgrade a cached login into verified model access.
 const testMessage=previous.testMessage||previous.message;
 if(status.canTest)return {...status,connected:!!previous.tested,model:previous.model,testedAt:previous.testedAt,testMessage,tested:!!previous.tested,
  message:previous.tested?`Last model test passed: ${previous.model}. Test again to verify current Antigravity access.`:`Last model test failed: ${testMessage}`};
 return {...status,model:previous.model,testedAt:previous.testedAt,testMessage,tested:!!previous.tested,
  message:!status.connected?status.message:previous.tested
   ?`Last model test passed: ${previous.model}. Sign-in found; test again to verify current access.`
   :`Last model test failed: ${testMessage}`};
}

export function savedAccountChecks(connections){
 return Object.fromEntries(Object.entries(connections).filter(([provider,value])=>accountLabels[provider]&&value?.testedAt)
  .map(([provider,value])=>[provider,{model:value.model,tested:!!value.tested,testedAt:value.testedAt,message:value.testMessage||value.message}]));
}

export function restoreAccountChecks(saved={}){
 if(!saved||typeof saved!=='object'||Array.isArray(saved))return {};
 return Object.fromEntries(Object.entries(saved).filter(([provider,value])=>accountLabels[provider]&&typeof value?.model==='string'&&typeof value.tested==='boolean'&&typeof value.testedAt==='string'&&typeof value.message==='string')
  .map(([provider,value])=>[provider,{model:value.model,tested:value.tested,testedAt:value.testedAt,message:value.message,connected:false}]));
}
