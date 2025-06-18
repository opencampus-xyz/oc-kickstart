import { ACHIEVEMENT_TYPES } from "@/constants";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import styles from "./EditVCProperties.module.css";

export const EditVCProperties = ({ vcProperties }) => {
  const [achievementType, setAchievementType] = useState(
    vcProperties?.achievementType ?? ACHIEVEMENT_TYPES[0]
  );
  useEffect(() => {
    setAchievementType(vcProperties?.achievementType ?? ACHIEVEMENT_TYPES[0]);
  }, [vcProperties]);
  return (
    <div className={styles.editContainer}>
      <TextField
        label="Title"
        id="title"
        name="title"
        required
        fullWidth
        defaultValue={vcProperties?.title}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <FormControl fullWidth required>
        <InputLabel id="achievement-type-label">Achievement Type</InputLabel>
        <Select
          labelId="achievement-type-label"
          id="achievement-type-select"
          name="achievementType"
          label="Achievement Type"
          required
          value={achievementType}
          onChange={(e) => setAchievementType(e.target.value)}
        >
          {ACHIEVEMENT_TYPES.map((achievementType) => (
            <MenuItem key={achievementType} value={achievementType}>{achievementType}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Expire In Days"
        id="expireInDays"
        name="expireInDays"
        defaultValue={vcProperties?.expireInDays}
        type="number"
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </div>
  );
};
