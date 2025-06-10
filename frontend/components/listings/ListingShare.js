import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Tooltip,
  } from "@mui/material";
import BookmarkIcon from '@mui/icons-material/Bookmark';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

export const ListingShare = ({ listing, showShareDialog, setShowShareDialog }) => {
    const handleClose = (event) => {
        event.stopPropagation();
        setShowShareDialog(false);
    };
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const listingUrl = `${origin}/listings/${listing.id}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&bgcolor=fff&color=000&format=png&qzone=10&data='${listingUrl}'`
    return (
        <Dialog 
            open={showShareDialog} 
            onClose={handleClose}
            onClick={(e) => e.stopPropagation()}
        >
            <DialogTitle>Share Listing</DialogTitle>
            <DialogContent>
                <div>
                    <img src={qr} alt="QR Code" />
                </div>
                <div>
                    <TextField
                        id="outlined-read-only-input"
                        defaultValue={listingUrl}
                        fullWidth={true}
                        slotProps={{
                            input: {
                                readOnly: true,
                            },
                        }}
                    />
                </div>
                <div>
                    <Button variant="contained" color="primary" fullWidth={true} onClick={() => {
                        navigator.clipboard.writeText(listingUrl);
                    }}>Copy Link</Button>
                </div>
                <div>
                    <Tooltip title="Bookmark">
                        <span>
                        <IconButton onClick={() => {
                            window.open(`https://www.google.com/bookmarks/mark?op=edit&bkmk=${listingUrl}&title=${listing.name}&annotation=${listing.description}`, "_blank");
                        }}>
                            <BookmarkIcon />
                        </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Facebook">
                        <span>
                        <IconButton onClick={() => {
                            window.open(`https://www.facebook.com/sharer.php?u=${listingUrl}`, "_blank");
                    }}>
                            <FacebookIcon />
                        </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Twitter">
                        <span>
                        <IconButton onClick={() => {
                            window.open(`https://www.twitter.com/share?url=${listingUrl}`, "_blank");
                    }}>
                            <TwitterIcon />
                        </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Email">
                        <span>
                        <IconButton onClick={() => {
                            window.open(`mailto:{}?subject=${listing.name}&body=${listingUrl}`, "_blank");
                    }}>
                            <EmailIcon />
                        </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="WhatsApp">
                        <span>
                        <IconButton onClick={() => {
                            window.open(`https://wa.me/?text=${listingUrl}`, "_blank");
                    }}>
                        <WhatsAppIcon />
                        </IconButton>
                        </span>
                    </Tooltip>
                </div>
            </DialogContent>
        </Dialog>
    )
}