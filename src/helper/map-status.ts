import type { IStatus, StatusLabel } from "../types/anime";
import type { AnilistMediaStatus } from "../types/provider";

export const mapAnilistStatus = (status: AnilistMediaStatus): IStatus => {
    switch (status) {
        case "RELEASING":
            return "airing"
        case "FINISHED":
            return "finished";
        case "CANCELLED":
            return "cancelled";
        case "NOT_YET_RELEASED":
            return "upcoming";
        case "HIATUS":
            return "hiatus"

        default:
            throw new Error("Unknown status type.")
    }
}

export const mapStatusToLabel = (status: IStatus): StatusLabel => {
    switch (status) {
        case "airing":
            return "Currently Airing"
        case "finished":
            return "Finished"
        case "cancelled":
            return "Cancelled"
        case "hiatus":
            return "Hiatus"
        case "upcoming":
            return "Coming Soon"
    }
}