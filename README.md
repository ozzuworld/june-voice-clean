# June Voice Assistant - React Native

A voice-powered AI assistant built with React Native, Expo, and LiveKit. This template provides a complete foundation for building real-time voice AI applications.

## Features

- 🎙️ **Real-time Voice Communication** - Powered by LiveKit WebRTC
- 🤖 **AI Agent Integration** - Connect to your backend AI agents
- 📱 **Cross-platform** - Runs on iOS, Android, and Web via Expo
- 🔒 **Secure Token Management** - Environment-based configuration
- 🎨 **Modern UI** - Clean, intuitive voice assistant interface
- 🔊 **Audio Session Management** - Proper audio handling for mobile
- 🎥 **Video Support** - Optional video streaming capabilities

## Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g expo-cli`)
- LiveKit Cloud account or self-hosted LiveKit server
- iOS Simulator / Android Emulator for testing

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/ozzuworld/june-voice-clean.git
cd june-voice-clean
npm install
```

### 2. Configure LiveKit

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your LiveKit configuration:
   ```bash
   # Required: Your LiveKit server URL
   EXPO_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
   
   # Option 1: Use LiveKit Cloud Sandbox (recommended)
   EXPO_PUBLIC_SANDBOX_ID=your-sandbox-token-server-id
   
   # Option 2: Manual keys (development only)
   # EXPO_PUBLIC_LIVEKIT_API_KEY=your-api-key
   # EXPO_PUBLIC_LIVEKIT_SECRET_KEY=your-secret-key
   ```

### 3. Set Up LiveKit

#### Option A: LiveKit Cloud (Recommended)

1. Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a new project
3. Create a Sandbox Token Server in your project settings
4. Copy the Sandbox ID to your `.env` file

#### Option B: Self-Hosted LiveKit

1. Follow the [LiveKit Self-Hosting Guide](https://docs.livekit.io/deploy/)
2. Update `EXPO_PUBLIC_LIVEKIT_URL` with your server URL
3. Generate API keys and add them to your `.env` file

### 4. Run the App

```bash
# Start the development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

**Note**: This app requires native code and won't work with Expo Go. You must use development builds or build the app locally.

## Project Structure

```
june-voice-clean/
├── app/
│   ├── (tabs)/
│   │   └── index.tsx          # Main app screen
│   └── _layout.tsx            # Root layout with LiveKit setup
├── components/
│   └── VoiceAssistant.tsx     # Main voice assistant interface
├── hooks/
│   └── useConnectionDetails.ts # LiveKit connection management
├── .env.example               # Environment configuration template
├── app.json                   # Expo configuration with LiveKit plugins
└── package.json               # Dependencies and scripts
```

## Key Components

### VoiceAssistant Component

The main interface for voice interactions:
- Real-time audio/video streaming
- Microphone and camera controls
- Connection status indicators  
- Participant management

### useConnectionDetails Hook

Manages LiveKit connection details:
- Environment-based configuration
- Secure token storage
- Sandbox and manual token generation
- Connection error handling

## Configuration Options

### Audio Settings

The app automatically configures audio sessions for optimal voice communication:
- Communication audio type for voice calls
- Automatic echo cancellation
- Noise suppression
- Gain control

### Video Settings

Optional video streaming with:
- Adaptive quality based on network
- Screen density optimization
- Camera controls

## Agent Integration

This frontend is designed to work with LiveKit Agents:

### Compatible Agent Frameworks
- [LiveKit Python Agents](https://github.com/livekit-examples/agent-starter-python)
- [LiveKit Node.js Agents](https://github.com/livekit-examples/agent-starter-node)
- Custom agents using the LiveKit server SDK

### Setting Up an Agent

1. Clone an agent starter template:
   ```bash
   # Python agent
   git clone https://github.com/livekit-examples/agent-starter-python
   
   # Node.js agent
   git clone https://github.com/livekit-examples/agent-starter-node
   ```

2. Configure the agent with your LiveKit server details
3. Run the agent in development mode
4. The agent will automatically join rooms and respond to voice input

## Development

### Building for Production

1. Update your LiveKit configuration for production
2. Set up a backend token server (never generate tokens client-side in production)
3. Build the app:
   ```bash
   # iOS
   eas build --platform ios
   
   # Android
   eas build --platform android
   ```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_LIVEKIT_URL` | LiveKit server WebSocket URL | Yes |
| `EXPO_PUBLIC_SANDBOX_ID` | LiveKit Cloud Sandbox ID | Yes (if using sandbox) |
| `EXPO_PUBLIC_LIVEKIT_API_KEY` | LiveKit API key | Yes (if not using sandbox) |
| `EXPO_PUBLIC_LIVEKIT_SECRET_KEY` | LiveKit secret key | Yes (if not using sandbox) |

### Common Issues

#### "Failed to register WebRTC globals"
- Ensure `@livekit/react-native-webrtc` is properly installed
- Check that the Expo plugins are correctly configured in `app.json`
- Try clearing the Metro cache: `npx expo start -c`

#### "Connection failed"
- Verify your LiveKit server URL is correct
- Check that your token/sandbox ID is valid
- Ensure your LiveKit server is running and accessible

#### "Audio not working"
- Check microphone permissions in your device settings
- Ensure you're not using Expo Go (use development build)
- Verify audio session initialization in the logs

## Documentation

- [LiveKit Documentation](https://docs.livekit.io/)
- [React Native SDK](https://docs.livekit.io/home/quickstarts/react-native/)
- [Expo Plugin Setup](https://docs.livekit.io/home/quickstarts/expo/)
- [LiveKit Agents](https://docs.livekit.io/agents/)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- [LiveKit Community Slack](https://livekit.io/join-slack)
- [GitHub Issues](https://github.com/ozzuworld/june-voice-clean/issues)
- [LiveKit Documentation](https://docs.livekit.io/)

---

**Built with ❤️ using LiveKit, React Native, and Expo**