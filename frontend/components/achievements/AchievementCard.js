import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import {
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import { useState } from "react";
import styles from "./AchievementCard.module.css";

export const AchievementCard = ({ achievement }) => {
  const [open, setOpen] = useState(false);

  const achievementDetails = achievement.credentialSubject.achievement;
  return (
    <Card
      key={achievement.id}
      sx={{ width: 300 }}
      variant="outlined"
      className={styles.cardContainer}
    >
      <CardActionArea onClick={() => setOpen(true)}>
        <CardContent>
          <div className={styles.achievementCardTitle}>
            {achievementDetails.name}
            <Chip label={achievementDetails.achievementType} />
          </div>
          <Typography variant="body1" component="p">
            {achievement.description}
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" onClick={() => setOpen(true)}>
          View More
        </Button>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent>
            <div className={styles.headerContainer}>
              <EmojiEventsOutlinedIcon sx={{ fontSize: 120 }} />
              <Typography variant="body1" component="p">
                {achievementDetails.achievementType}
              </Typography>
              <Typography variant="h5" component="h2">
                {achievementDetails.name}
              </Typography>
              <Typography variant="body1" component="p">
                ID: {achievementDetails.identifier}
              </Typography>
            </div>
            <div className={styles.aboutHeader}>About:</div>
            <div className={styles.aboutContent}>
              {achievementDetails.description}
            </div>
            <Divider />
            <div className={styles.detailContainer}>
              <div>Awarded Date:</div>
              <div>
                {format(new Date(achievement.awardedDate), "dd MMM yyyy")}
              </div>
            </div>
            <div className={styles.detailContainer}>
              <div>Valid from:</div>
              <div>
                {format(new Date(achievement.validFrom), "dd MMM yyyy")}
              </div>
            </div>
            <div className={styles.detailContainer}>
              <div>Valid to:</div>
              <div>
                {achievement.validUntil
                  ? format(new Date(achievement.validUntil), "dd MMM yyyy")
                  : "N/A"}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardActions>
    </Card>
  );
};
