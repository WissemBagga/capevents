package com.capevents.backend.rewards;

public enum RewardCode {
    TELEWORK_DAY("Télétravail", "1 journée de télétravail", 500, false),
    PARKING_PASS("Parking", "Avantage parking / accès parking", 300, true),
    CAFE_VOUCHER("Café", "Bon café ou boisson", 100, false),
    GIFT_CARD("Bon cadeau", "Bon cadeau entreprise", 400, true);

    private final String title;
    private final String description;
    private final int pointsCost;
    private final boolean requiresHrAction;

    RewardCode(String title, String description, int pointsCost, boolean requiresHrAction) {
        this.title = title;
        this.description = description;
        this.pointsCost = pointsCost;
        this.requiresHrAction = requiresHrAction;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public int getPointsCost() {
        return pointsCost;
    }

    public boolean isRequiresHrAction() {
        return requiresHrAction;
    }
}