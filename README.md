# June Voice Assistant - React Native

A voice-powered AI assistant built with React Native, Expo, and **LiveKit**. This implementation follows the official LiveKit React Native patterns and provides a complete foundation for building real-time voice AI applications.

## ✨ Features

- 🎙️ **Real-time Voice Communication** - Powered by LiveKit WebRTC
- 🤖 **AI Agent Integration** - Connect to your backend AI agents
- 📱 **Cross-platform** - Runs on iOS, Android, and Web via Expo
- 🔒 **Secure Token Management** - Sandbox and backend token generation
- 🎨 **Modern UI** - Clean, intuitive voice assistant interface
- 🔊 **Audio Session Management** - Proper audio handling for mobile
- 🎥 **Video Support** - Optional video streaming capabilities
- ⚡ **Official LiveKit Patterns** - Uses official hooks and components

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g expo-cli`)
- LiveKit Cloud account or self-hosted LiveKit server
- iOS Simulator / Android Emulator for testing

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
   ```

### 3. Set Up LiveKit

#### Option A: LiveKit Cloud (Recommended)

1. Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a new project
3. Create a **Sandbox Token Server** in your project settings
4. Copy the Sandbox ID to your `.env` file

#### Option B: Self-Hosted LiveKit

1. Follow the [LiveKit Self-Hosting Guide](https://docs.livekit.io/deploy/)
2. Update `EXPO_PUBLIC_LIVEKIT_URL` with your server URL
3. Generate API keys and add them to your `.env` file

### 4. Run the App

```bash
# Clear Metro cache
npx expo start -c

# Build development build (required for LiveKit)
npx expo run:ios
# or
npx expo run:android
```

**Important**: This app requires native code and won't work with Expo Go. You must use development builds.

## 📁 Project Structure

```
june-voice-clean/
├── App.tsx                    # Root app with LiveKit globals setup
├── index.js                   # Entry point with registerGlobals()
├── src/
│   ├── JuneVoiceApp.tsx      # Main app component with LiveKitRoom
│   ├── components/
│   │   └── RoomView.tsx       # Room interface with tracks and controls
│   └── utils/
│       └── tokenGenerator.ts  # Token generation utilities
├── .env.example               # Environment configuration template
├── app.json                   # Expo config with LiveKit plugins
└── package.json               # Dependencies with official LiveKit packages
```

## 🔧 Key Components

### App.tsx

Root application component that:
- Registers LiveKit globals with `registerGlobals()`
- Initializes AudioSession for mobile
- Wraps app with SafeAreaProvider

### JuneVoiceApp.tsx

Main application logic:
- Connection form with server URL, room name, participant name
- `LiveKitRoom` wrapper with proper configuration
- Error handling and connection state management

### RoomView.tsx

Room interface using official LiveKit hooks:
- `useRoom()`, `useParticipants()`, `useTracks()`
- Audio/video track rendering with `AudioTrack` and `VideoTrack`
- Microphone and camera controls
- Connection state monitoring

### tokenGenerator.ts

Secure token generation:
- **Sandbox tokens** (recommended for development)
- Manual token generation (development only)
- Configuration validation
- Production security warnings

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_LIVEKIT_URL` | LiveKit server WebSocket URL | Yes |
| `EXPO_PUBLIC_SANDBOX_ID` | LiveKit Cloud Sandbox ID | Yes (if using sandbox) |
| `EXPO_PUBLIC_LIVEKIT_API_KEY` | LiveKit API key | Yes (if not using sandbox) |
| `EXPO_PUBLIC_LIVEKIT_SECRET_KEY` | LiveKit secret key | Yes (if not using sandbox) |

### Audio Settings

Automatically configured for optimal voice communication:
- Communication audio type for voice calls
- Automatic echo cancellation
- Noise suppression
- Gain control
- Background audio support

### Permissions

Configured in `app.json`:
- **iOS**: Microphone, Camera, Background Audio
- **Android**: RECORD_AUDIO, CAMERA, MODIFY_AUDIO_SETTINGS, Bluetooth

## 🤖 Agent Integration

This frontend works seamlessly with LiveKit Agents:

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

## 🚀 Development

### Building for Production

1. **Never generate tokens client-side in production**
2. Set up a backend token server
3. Update your LiveKit configuration for production
4. Build the app:
   ```bash
   # iOS
   eas build --platform ios
   
   # Android
   eas build --platform android
   ```

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

## 📚 Implementation Notes

### Official LiveKit Patterns Used

✅ **Proper globals registration** with `registerGlobals()` in index.js
✅ **AudioSession management** for mobile audio handling
✅ **LiveKitRoom wrapper** with proper configuration
✅ **Official hooks**: `useRoom()`, `useParticipants()`, `useTracks()`
✅ **Track components**: `AudioTrack`, `VideoTrack` with proper refs
✅ **Connection state monitoring** and error handling
✅ **Mobile permissions** and background audio support

### Security Best Practices

- ✅ **Sandbox tokens** for safe development
- ✅ **Environment-based configuration**
- ✅ **Production warnings** for unsafe practices
- ✅ **Token validation** and error handling

## 📖 Documentation

- [LiveKit Documentation](https://docs.livekit.io/)
- [React Native SDK](https://docs.livekit.io/home/quickstarts/react-native/)
- [Expo Plugin Setup](https://docs.livekit.io/home/quickstarts/expo/)
- [LiveKit Agents](https://docs.livekit.io/agents/)
- [Token Generation](https://docs.livekit.io/home/client/connect/)

## 🆘 Support

- [LiveKit Community Slack](https://livekit.io/join-slack)
- [GitHub Issues](https://github.com/ozzuworld/june-voice-clean/issues)
- [LiveKit Documentation](https://docs.livekit.io/)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using Official LiveKit React Native SDK, Expo, and TypeScript**