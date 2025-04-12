package metadata

import (
	"context"
	"net/http"
	"strings"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/services/anilist"
	"github.com/agnivade/levenshtein"
	"golang.org/x/text/unicode/norm"
)

type AnilistMetaProvider struct {
	anilist *anilist.Client
}

func NewAnilistMetaProvider() *AnilistMetaProvider {
	return &AnilistMetaProvider{
		anilist: anilist.NewClient(http.DefaultClient),
	}
}

var _ MetaProvider = (*AnilistMetaProvider)(nil)

// GetSeries implements MetaProvider.
func (a *AnilistMetaProvider) GetSeries(ctx context.Context, metaID *models.MetadataID) (SeriesMetadata, error) {
	service, id := metaID.IntID()
	if service != "anilist" {
		return SeriesMetadata{}, ErrWrongService
	}
	resp, err := a.anilist.Search(ctx, "", id)
	if err != nil {
		return SeriesMetadata{}, err
	}

	if len(resp.Page.Media) == 0 {
		return SeriesMetadata{}, ErrNotFound
	}

	return anilistSeriesMetadata(&resp.Page.Media[0], ""), nil
}

// SearchSeries implements MetaProvider.
func (a *AnilistMetaProvider) SearchSeries(ctx context.Context, rawName string) ([]SeriesMetadata, error) {
	resp, err := a.anilist.Search(ctx, rawName, 0)
	if err != nil {
		return nil, err
	}

	name := normalize(rawName)

	results := make([]SeriesMetadata, len(resp.Page.Media))
	for i, media := range resp.Page.Media {
		results[i] = anilistSeriesMetadata(&media, name)
	}

	return results, nil
}

func anilistStaffRoles(staffRole string) []StaffRole {
	staffRoleLower := strings.ToLower(staffRole)
	roles := []StaffRole{}
	if strings.Contains(staffRoleLower, "story") {
		roles = append(roles, RoleWriter)
	}
	if strings.Contains(staffRoleLower, "art") {
		roles = append(roles, RoleArtist)
	}
	if strings.Contains(staffRoleLower, "editor") {
		roles = append(roles, RoleEditor)
	}
	if strings.Contains(staffRoleLower, "translator") {
		roles = append(roles, RoleTranslator)
	}
	if strings.Contains(staffRoleLower, "assistant") {
		roles = append(roles, RoleAssistant)
	}
	if strings.Contains(staffRoleLower, "lettering") {
		roles = append(roles, RoleLetterer)
	}
	return roles
}
func anilistSeriesMetadata(media *anilist.SearchPageMedia, name string) SeriesMetadata {
	titles := []string{}
	if media.Title.English != "" {
		titles = append(titles, media.Title.English)
	}
	if media.Title.Romaji != "" {
		titles = append(titles, media.Title.Romaji)
	}

	tags := make([]string, len(media.Tags))
	for i, tag := range media.Tags {
		tags[i] = tag.Name
	}

	staff := make([]Staff, 0, len(media.Staff.Edges))
	for _, staffMember := range media.Staff.Edges {
		for _, role := range anilistStaffRoles(staffMember.Role) {
			staff = append(staff, Staff{
				Name: staffMember.Node.Name.Full,
				Role: role,
			})
		}
	}

	return SeriesMetadata{
		ID:            models.NewAnilistID(media.Id),
		Service:       models.MetadataServiceAnilist,
		MatchDistance: levenshtein.ComputeDistance(normalize(media.Title.English), name),
		Title:         titles[0],
		Aliases:       titles[1:],
		Year:          media.StartDate.Year,
		Description:   media.Description,
		CoverImageURL: media.CoverImage.ExtraLarge,
		Genres:        media.Genres,
		Tags:          tags,
		Staff:         staff,
	}
}

// // UpdateMetadata implements MetaProvider.
// func (a *AnilistMetaProvider) UpdateMetadata(ctx context.Context, tx *sqlx.Tx, s *models.Series) error {
// 	var bestMatch *anilist.SearchPageMedia
// 	var anilistId int

// 	if s.MetadataID != nil {
// 		var ok bool
// 		anilistId, ok = s.MetadataID.IntID()
// 		if !ok {
// 			return nil
// 		}
// 	}
// 	if anilistId != 0 {
// 		resp, err := a.anilist.Search(ctx, "", anilistId)
// 		if err != nil {
// 			return err
// 		}

// 		if len(resp.Page.Media) != 1 {
// 			return fmt.Errorf("AnilistMetaProvider.UpdateMetadata: anilist id lookup returned %d results expected 1", len(resp.Page.Media))
// 		}
// 		bestMatch = &resp.Page.Media[0]
// 	} else {
// 	}

// 	s.Name = bestMatch.Title.English
// 	s.MetadataID = models.NewAnilistID(bestMatch.Id)

// 	if !s.CoverImageId.Valid {
// 		coverImage, err := models.DownloadFile(ctx, tx, bestMatch.GetCoverImage().ExtraLarge)
// 		if err != nil {
// 			return fmt.Errorf("AnilistMetaProvider.UpdateMetadata: downloading cover: %w", err)
// 		}
// 		s.CoverImageId = uuid.NullUUID{UUID: coverImage.ID, Valid: true}

// 		spew.Dump(coverImage)
// 	}

// 	return nil
// }

func normalize(s string) string {
	return strings.ToLower(norm.NFC.String(s))
}
