using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.ViewModels.Admin;

namespace HealthWeb.Services;

public interface IExerciseAdminService
{
    Task<ExerciseDashboardDto> GetExerciseDashboardAsync(CancellationToken cancellationToken = default);

    Task<ExerciseDetailDto?> GetExerciseDetailAsync(int exerciseId, CancellationToken cancellationToken = default);

    Task<ExerciseItemDto> CreateExerciseAsync(ExerciseUpsertRequest request, CancellationToken cancellationToken = default);

    Task<ExerciseItemDto?> UpdateExerciseAsync(int exerciseId, ExerciseUpsertRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteExerciseAsync(int exerciseId, CancellationToken cancellationToken = default);

    Task<ExerciseItemDto?> SetExerciseVisibilityAsync(int exerciseId, bool hidden, CancellationToken cancellationToken = default);

    Task<List<string>> GetDistinctMuscleGroupsAsync(CancellationToken cancellationToken = default);

    Task<List<string>> GetDistinctEquipmentAsync(CancellationToken cancellationToken = default);
}
