import { EmptyRequest } from "@shared/proto/common"
import { AccountServiceClient } from "@webview-ui/services/grpc-client"
import { memo } from "react"

const AccountOptions = () => {
	const handleAccountClick = () => {
		AccountServiceClient.accountLoginClicked(EmptyRequest.create()).catch((err) =>
			console.error("Failed to get login URL:", err),
		)
	}

	// Call handleAccountClick immediately when component mounts
	handleAccountClick()

	return null // This component doesn't render anything
}

export default memo(AccountOptions)
