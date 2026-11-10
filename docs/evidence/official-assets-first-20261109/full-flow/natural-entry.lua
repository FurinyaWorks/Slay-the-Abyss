local generated="/workspace/scratch/c1a4970a76e0/pr588-official-assets/.artifacts/pr588/campaign-validation/final-seed2/generated"
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs({"abyss_art_features","abyss_component_binding","abyss_data","abyss_map_controls","abyss_map_layout","abyss_menu_background_asset","abyss_monster_actor_binding","abyss_monster_art_data","abyss_narrative","abyss_original_v4_data","abyss_presentation","abyss_ready_card_assets","abyss_ready_card_binding","abyss_theme","abyss_traveler_portrait_assets","abyss_ui_layout","abyss_ui_profile","abyss_ui_templates","abyss_v25_card_assets"})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
OFFICIAL_CAMPAIGN_SEED=2
OFFICIAL_CAMPAIGN_CAPTURE=true
OFFICIAL_CAMPAIGN_SOURCE="f54d388556db5e5c6b4c4ab0cd1a8610c0ef35fc5f6f50afc8e183055e9abcab"
dofile('scripts/official-assets-campaign.lua')
