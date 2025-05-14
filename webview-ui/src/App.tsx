import { ExtensionMessage } from "@shared/ExtensionMessage"
import { useCallback, useEffect, useState } from "react"
import { useEvent } from "react-use"
import AccountView from "./components/account/AccountView"
import ChatView from "./components/chat/ChatView"
import HistoryView from "./components/history/HistoryView"
import McpView from "./components/mcp/configuration/McpConfigurationView"
import SettingsView from "./components/settings/SettingsView"
import WelcomeView from "./components/welcome/WelcomeView"
import { useExtensionState } from "./context/ExtensionStateContext"
import { Providers } from "./Providers"
import { vscode } from "./utils/vscode"

const AppContent = () => {
	const { didHydrateState, showWelcome, shouldShowAnnouncement, showMcp, mcpTab } = useExtensionState()
	const [showSettings, setShowSettings] = useState(false)
	const hideSettings = useCallback(() => setShowSettings(false), [])
	const [showHistory, setShowHistory] = useState(false)
	const [showAccount, setShowAccount] = useState(false)
	const [showAnnouncement, setShowAnnouncement] = useState(false)

	const { setShowMcp, setMcpTab } = useExtensionState()

	// Debug logging for initial state
	useEffect(() => {
		console.log("[DEBUG] AppContent mounted with state:", {
			didHydrateState,
			showWelcome,
			shouldShowAnnouncement,
			showMcp,
			mcpTab,
		})
	}, [])

	// Debug logging for state changes
	useEffect(() => {
		console.log("[DEBUG] View state changed:", {
			showSettings,
			showHistory,
			showMcp,
			showAccount,
			showAnnouncement,
		})
	}, [showSettings, showHistory, showMcp, showAccount, showAnnouncement])

	const closeMcpView = useCallback(() => {
		console.log("[DEBUG] Closing MCP view")
		setShowMcp(false)
		setMcpTab(undefined)
	}, [setShowMcp, setMcpTab])

	const handleMessage = useCallback(
		(e: MessageEvent) => {
			const message: ExtensionMessage = e.data
			console.log("[DEBUG] Received message:", message)

			switch (message.type) {
				case "action":
					switch (message.action!) {
						case "settingsButtonClicked":
							console.log("[DEBUG] Settings button clicked")
							setShowSettings(true)
							setShowHistory(false)
							closeMcpView()
							setShowAccount(false)
							break
						case "historyButtonClicked":
							console.log("[DEBUG] History button clicked")
							setShowSettings(false)
							setShowHistory(true)
							closeMcpView()
							setShowAccount(false)
							break
						case "mcpButtonClicked":
							console.log("[DEBUG] MCP button clicked with tab:", message.tab)
							setShowSettings(false)
							setShowHistory(false)
							if (message.tab) {
								setMcpTab(message.tab)
							}
							setShowMcp(true)
							setShowAccount(false)
							break
						case "accountButtonClicked":
							console.log("[DEBUG] Account button clicked")
							setShowSettings(false)
							setShowHistory(false)
							closeMcpView()
							setShowAccount(true)
							break
						case "chatButtonClicked":
							console.log("[DEBUG] Chat button clicked")
							setShowSettings(false)
							setShowHistory(false)
							closeMcpView()
							setShowAccount(false)
							break
					}
					break
			}
		},
		[setShowMcp, setMcpTab, closeMcpView],
	)

	useEvent("message", handleMessage)

	useEffect(() => {
		if (shouldShowAnnouncement) {
			console.log("[DEBUG] Showing announcement")
			setShowAnnouncement(true)
			vscode.postMessage({ type: "didShowAnnouncement" })
		}
	}, [shouldShowAnnouncement])

	useEffect(() => {
		console.log("[DEBUG] didHydrateState changed:", didHydrateState)
	}, [didHydrateState])

	if (!didHydrateState) {
		console.log("[DEBUG] State not yet hydrated, rendering null")
		return null
	}

	console.log("[DEBUG] Rendering AppContent with view state:", {
		showWelcome,
		showSettings,
		showHistory,
		showMcp,
		showAccount,
	})

	return (
		<>
			{showWelcome ? (
				<WelcomeView />
			) : (
				<>
					{showSettings && <SettingsView onDone={hideSettings} />}
					{showHistory && <HistoryView onDone={() => setShowHistory(false)} />}
					{showMcp && <McpView initialTab={mcpTab} onDone={closeMcpView} />}
					{showAccount && <AccountView onDone={() => setShowAccount(false)} />}
					{/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
					<ChatView
						showHistoryView={() => {
							console.log("[DEBUG] Showing history view from ChatView")
							setShowSettings(false)
							closeMcpView()
							setShowAccount(false)
							setShowHistory(true)
						}}
						isHidden={showSettings || showHistory || showMcp || showAccount}
						showAnnouncement={showAnnouncement}
						hideAnnouncement={() => {
							console.log("[DEBUG] Hiding announcement")
							setShowAnnouncement(false)
						}}
					/>
				</>
			)}
		</>
	)
}

const App = () => {
	console.log("[DEBUG] App component rendering")
	return (
		<Providers>
			<AppContent />
		</Providers>
	)
}

export default App
