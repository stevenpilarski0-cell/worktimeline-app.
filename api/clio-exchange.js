// WorkTimeline™ | Production API Handshake
export const CLIO_CONFIG = {
    // Verified Client ID (Permanent Key)
    clientId: "18C4aBAD8YThRDG04xn_-rs8XQTdc0ZJyhPefMZR-0s",
    
    // Verified Redirect URI (Exact Match)
    redirectUri: "https://worktimeline-app.vercel.app/index.html",
    
    // Regional Gateway (Canada Instance)
    authUrl: "https://ca.app.clio.com/oauth/authorize",
    
    // Aligned Scopes: These MUST match your Portal Checkboxes
    // Added 'identity' as it is the foundation for the pulse verification
    scopes: "identity leads_read" 
};
