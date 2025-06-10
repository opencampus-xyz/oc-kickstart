import {
    IconButton,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { ListingShare } from "./ListingShare";  

export const ListingShareButton = ({ listing, showShareDialog, setShowShareDialog }) => {
    return (
        <>
            <IconButton
                color="secondary"
                size="small"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowShareDialog(true);
                }}
            >
                <ShareIcon fontSize="inherit" />
            </IconButton>

            <ListingShare
                listing={listing}
                showShareDialog={showShareDialog}
                setShowShareDialog={setShowShareDialog}
            />
        </>
    )
}
