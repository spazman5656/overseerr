import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import SeasonRequest from './SeasonRequest';
import { MediaRequestStatus } from '@server/constants/media';

@Entity()
export class EpisodeRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  episodeNumber: number;

  @Column({ type: 'int', default: MediaRequestStatus.PENDING })
  public status: MediaRequestStatus;

  @ManyToOne(() => SeasonRequest, (seasonRequest) => seasonRequest.episodes, {
    onDelete: 'CASCADE',
  })
  season: SeasonRequest;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(init?: Partial<EpisodeRequest>) {
    Object.assign(this, init);
  }
}
