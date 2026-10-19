export type EquipoRecord = {
  id: string;
  name: string;
  normalizedName: string;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateEquipoCommand = {
  name: string;
  normalizedName: string;
};

export type UpdateEquipoCommand = Partial<CreateEquipoCommand> & {
  id: string;
  isVisible?: boolean;
};
