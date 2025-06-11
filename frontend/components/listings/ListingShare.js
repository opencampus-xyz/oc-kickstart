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
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export const ListingShare = ({ listing, showShareDialog, setShowShareDialog }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const handleClose = (event) => {
        event.stopPropagation();
        setShowShareDialog(false);
    };
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const listingUrl = `${origin}/listings/${listing.id}`;

    useEffect(() => {
        if (!showShareDialog) return;
        
        QRCode.toDataURL(listingUrl, { width: 300, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrCodeUrl(url))
        .catch(error => console.error('QR code generation failed:', error));
    }, [showShareDialog, listingUrl]);

    return (
        <Dialog 
            open={showShareDialog} 
            onClose={handleClose}
            onClick={(e) => e.stopPropagation()}
        >
            <DialogTitle>Share Listing</DialogTitle>
            <DialogContent>
                <div style={{ textAlign: 'center', marginBottom: '1rem', minHeight: '300px' }}>
                    <img src={qrCodeUrl} alt="QR Code" style={{ display: 'block', margin: '0 auto', maxWidth: '300px' }} />
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